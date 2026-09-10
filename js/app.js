var state = {
  classData: null,
  groups: [],
  members: [],
  angle: 0,
  spinning: false
};

function $(id) { return document.getElementById(id); }

async function loadClass() {
  requireConfig();

  var classes = await rest("/classes?select=*&is_active=eq.true&order=created_at.asc");
  if (!classes.length) throw new Error("Chưa có lớp trong database.");

  var cls = classes[0];

  var groups = await rest("/groups?class_id=eq." + encodeURIComponent(cls.id) + "&select=*&order=position.asc,created_at.asc");
  var members = await rest("/members?class_id=eq." + encodeURIComponent(cls.id) + "&select=*&order=name.asc");

  var ids = members.map(function(m) { return m.id; });
  var weights = ids.length
    ? await rest("/member_weights?member_id=in.(" + ids.join(",") + ")&select=*")
    : [];

  members.forEach(function(m) {
    m.weights = {};
    weights.forEach(function(w) {
      if (w.member_id === m.id) m.weights[w.group_id] = Number(w.percent);
    });
  });

  state.classData = {id: cls.id, name: cls.name};
  state.groups = groups;
  state.members = members;
  drawWheel();
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
  var w = canvas.width;
  var h = canvas.height;
  var cx = w / 2;
  var cy = h / 2;
  var radius = Math.min(w, h) / 2 - 12;

  ctx.clearRect(0, 0, w, h);

  if (!state.groups.length) return;

  var slice = Math.PI * 2 / state.groups.length;
  var startOffset = -Math.PI / 2;

  for (var i = 0; i < state.groups.length; i++) {
    var a0 = startOffset + state.angle + i * slice;
    var a1 = a0 + slice;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, a0, a1);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? "#39a96b" : "#1f8f55";
    ctx.fill();
    ctx.strokeStyle = "#eafff2";
    ctx.lineWidth = 4;
    ctx.stroke();

    var mid = (a0 + a1) / 2;
    ctx.save();
    ctx.translate(
      cx + Math.cos(mid) * radius * .62,
      cy + Math.sin(mid) * radius * .62
    );
    ctx.rotate(mid + Math.PI / 2);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 25px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.groups[i].name, 0, 0);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 54, 0, Math.PI * 2);
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

  var end = start + 6 * Math.PI * 2 + delta;
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
  return state.members.find(function(m) {
    return m.name.trim().toLowerCase() === q;
  });
}

function addHistory(member, group) {
  if (!state.classData) return;

  rest("/history", {
    method: "POST",
    headers: apiHeaders({"Prefer": "return=minimal"}),
    body: JSON.stringify({
      class_id: state.classData.id,
      member_id: member.id,
      group_id: group.id
    })
  }).catch(function() {});
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
    $("status").className = "status error";
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

$("loginBtn").addEventListener("click", async function() {
  var password = $("adminPassword").value;

  if (!password) {
    $("loginError").textContent = "Nhập mật khẩu.";
    return;
  }

  $("loginBtn").disabled = true;
  $("loginError").textContent = "Đang kiểm tra...";

  try {
    var token = await rpc("admin_login", {p_password: password});

    if (!token || typeof token !== "string") {
      throw new Error("Supabase không trả về phiên đăng nhập.");
    }

    // Kiểm tra token ngay trước khi chuyển sang trang Admin.
    var check = await rpc("admin_api", {
      p_token: token,
      p_action: "classes_list",
      p_payload: {}
    });

    if (check && check.error === "INVALID_SESSION") {
      throw new Error("Token đăng nhập không hợp lệ.");
    }

    sessionStorage.setItem("groupPickerAdminToken", token);
    location.href = "admin.html";
  } catch (e) {
    console.error("ADMIN LOGIN ERROR:", e);
    var msg = e && e.message ? e.message : String(e);
    if (msg.indexOf("INVALID_PASSWORD") !== -1) {
      $("loginError").textContent = "Sai mật khẩu.";
    } else {
      $("loginError").textContent = "Lỗi đăng nhập: " + msg;
    }
  } finally {
    $("loginBtn").disabled = false;
  }
});

loadClass().catch(function(err) {
  $("status").textContent = err.message;
  $("status").className = "status error";
});
