var state = {
  classData: null,
  groups: [],
  members: [],
  angle: 0,
  spinning: false
};

function $(id) { return document.getElementById(id); }

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function defaultData() {
  return {
    classes: [{
      id: uid(),
      name: "Lớp mẫu",
      groups: [
        {id: uid(), name: "Nhóm 1"},
        {id: uid(), name: "Nhóm 2"},
        {id: uid(), name: "Nhóm 3"},
        {id: uid(), name: "Nhóm 4"}
      ],
      members: [
        {id: uid(), name: "Bùi Huỳnh Băng", weights: {}},
        {id: uid(), name: "Thanh", weights: {}}
      ],
      history: []
    }],
    currentClass: 0
  };
}

function getData() {
  var raw = localStorage.getItem("groupPickerData");
  if (!raw) {
    var d = defaultData();
    normalizeWeights(d.classes[0]);
    localStorage.setItem("groupPickerData", JSON.stringify(d));
    return d;
  }
  return JSON.parse(raw);
}

function saveData(d) {
  localStorage.setItem("groupPickerData", JSON.stringify(d));
}

function normalizeWeights(cls) {
  cls.members.forEach(function(m) {
    var w = {};
    cls.groups.forEach(function(g) {
      w[g.id] = Number(m.weights && m.weights[g.id]) || 0;
    });
    if (cls.groups.length && Object.values(w).reduce(function(a,b){return a+b;},0) === 0) {
      w[cls.groups[0].id] = 100;
    }
    m.weights = w;
  });
}

async function loadClass() {
  if (USE_SUPABASE) {
    await loadFromSupabase();
  } else {
    var d = getData();
    state.classData = d.classes[d.currentClass] || d.classes[0];
    state.groups = state.classData.groups || [];
    state.members = state.classData.members || [];
  }
  drawWheel();
}

async function loadFromSupabase() {
  var headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": "Bearer " + SUPABASE_ANON_KEY
  };
  var cRes = await fetch(SUPABASE_URL + "/rest/v1/classes?select=*&order=created_at", {headers: headers});
  if (!cRes.ok) throw new Error("Không đọc được classes từ Supabase");
  var classes = await cRes.json();
  if (!classes.length) throw new Error("Chưa có lớp trong database");
  var cls = classes[0];

  var gRes = await fetch(SUPABASE_URL + "/rest/v1/groups?class_id=eq." + encodeURIComponent(cls.id) + "&select=*&order=created_at", {headers: headers});
  var mRes = await fetch(SUPABASE_URL + "/rest/v1/members?class_id=eq." + encodeURIComponent(cls.id) + "&select=*&order=created_at", {headers: headers});
  var groups = await gRes.json();
  var members = await mRes.json();

  var ids = members.map(function(m){ return m.id; }).join(",");
  var weights = ids ? await fetch(SUPABASE_URL + "/rest/v1/member_weights?member_id=in.(" + ids + ")&select=*", {headers: headers}).then(function(r){return r.json();}) : [];

  members.forEach(function(m) {
    m.weights = {};
    weights.filter(function(w){return w.member_id === m.id;}).forEach(function(w){m.weights[w.group_id] = Number(w.percent);});
  });

  state.classData = {id: cls.id, name: cls.name, groups: groups, members: members, history: []};
  state.groups = groups;
  state.members = members;
}

function weightedRandom(member) {
  var total = 0;
  state.groups.forEach(function(g) {
    total += Number(member.weights[g.id]) || 0;
  });
  if (total <= 0) return Math.floor(Math.random() * state.groups.length);

  var r = Math.random() * total;
  for (var i = 0; i < state.groups.length; i++) {
    r -= Number(member.weights[state.groups[i].id]) || 0;
    if (r < 0) return i;
  }
  return state.groups.length - 1;
}

function drawWheel() {
  var canvas = $("wheel");
  var ctx = canvas.getContext("2d");
  var w = canvas.width, h = canvas.height;
  var cx = w / 2, cy = h / 2, radius = Math.min(w,h)/2 - 12;
  ctx.clearRect(0,0,w,h);

  if (!state.groups.length) return;

  var slice = Math.PI * 2 / state.groups.length;
  var startOffset = -Math.PI / 2;

  for (var i = 0; i < state.groups.length; i++) {
    var a0 = startOffset + state.angle + i * slice;
    var a1 = a0 + slice;

    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,radius,a0,a1);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? "#39a96b" : "#1f8f55";
    ctx.fill();
    ctx.strokeStyle = "#eafff2";
    ctx.lineWidth = 4;
    ctx.stroke();

    var mid = (a0 + a1) / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(mid) * radius * .62, cy + Math.sin(mid) * radius * .62);
    ctx.rotate(mid + Math.PI / 2);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 25px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.groups[i].name, 0, 0);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(cx,cy,54,0,Math.PI*2);
  ctx.fillStyle = "#0d6b3d";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("SPIN", cx, cy);
}

/*
  FIX QUAN TRỌNG:
  Pointer nằm ở đỉnh (góc -PI/2).
  Với slice i, tâm slice là:
      -PI/2 + i*slice + slice/2 + angle
  Ta chọn angle sao cho tâm slice i đúng bằng -PI/2.
  => angle = -(i*slice + slice/2)
  Sau đó cộng số vòng nguyên 2PI để animation quay nhiều vòng nhưng
  điểm cuối vẫn chính xác vào đúng nhóm đã chọn.
*/
function targetAngleForIndex(index) {
  var slice = Math.PI * 2 / state.groups.length;
  return -(index * slice + slice / 2);
}

function normalizeAngle(a) {
  var two = Math.PI * 2;
  a = a % two;
  if (a < 0) a += two;
  return a;
}

function spinToIndex(index, done) {
  var start = state.angle;
  var targetBase = targetAngleForIndex(index);

  var startN = normalizeAngle(start);
  var targetN = normalizeAngle(targetBase);

  var delta = targetN - startN;
  if (delta < 0) delta += Math.PI * 2;

  var extraTurns = 6;
  var end = start + extraTurns * Math.PI * 2 + delta;
  var duration = 4600;
  var t0 = performance.now();

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function frame(now) {
    var t = Math.min(1, (now - t0) / duration);
    state.angle = start + (end - start) * easeOut(t);
    drawWheel();

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      state.angle = targetBase;
      drawWheel();
      done();
    }
  }
  requestAnimationFrame(frame);
}

function findMember(name) {
  var q = name.trim().toLowerCase();
  return state.members.find(function(m){ return m.name.trim().toLowerCase() === q; });
}

function addHistory(member, group) {
  var item = {name: member.name, group: group.name, time: new Date().toLocaleString("vi-VN")};

  if (USE_SUPABASE) {
    fetch(SUPABASE_URL + "/rest/v1/history", {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({class_id: state.classData.id, member_id: member.id, group_id: group.id})
    }).catch(function(){});
  } else {
    state.classData.history.unshift(item);
    var d = getData();
    d.classes[d.currentClass] = state.classData;
    saveData(d);
  }
}

$("spinBtn").addEventListener("click", function() {
  if (state.spinning) return;

  var member = findMember($("memberName").value);
  if (!member) {
    $("status").textContent = "Không tìm thấy tên này trong lớp.";
    $("status").className = "status error";
    return;
  }
  if (!state.groups.length) {
    $("status").textContent = "Lớp chưa có nhóm.";
    return;
  }

  var index = weightedRandom(member);
  var selected = state.groups[index];

  state.spinning = true;
  $("spinBtn").disabled = true;
  $("result").classList.add("hidden");
  $("status").textContent = "Đang quay...";
  $("status").className = "status";

  spinToIndex(index, function() {
    $("resultGroup").textContent = selected.name;
    $("result").classList.remove("hidden");
    $("status").textContent = "Đã quay xong.";
    $("status").className = "status success";
    addHistory(member, selected);
    state.spinning = false;
    $("spinBtn").disabled = false;
  });
});

$("adminBtn").addEventListener("click", function() {
  $("loginModal").classList.remove("hidden");
  $("adminPassword").focus();
});
$("closeLogin").addEventListener("click", function() {
  $("loginModal").classList.add("hidden");
});
$("loginBtn").addEventListener("click", function() {
  if ($("adminPassword").value === ADMIN_PASSWORD) {
    sessionStorage.setItem("groupPickerAdmin", "1");
    location.href = "admin.html";
  } else {
    $("loginError").textContent = "Sai mật khẩu.";
  }
});

loadClass().catch(function(err) {
  $("status").textContent = err.message;
  $("status").className = "status error";
});
