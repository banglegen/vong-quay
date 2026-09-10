var state = {
  classData: null,
  groups: [],
  members: [],
  counts: {},
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

  var countData = await rpc("group_counts", {p_class_id: cls.id});

  state.classData = {id: cls.id, name: cls.name};
  state.groups = groups;
  state.members = members;
  state.counts = countData || {};
  drawWheel();
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

  function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

  function frame(now) {
    var t = Math.min(1, (now - t0) / duration);
    state.angle = start + (end - start) * easeOut(t);
    drawWheel();

    if (t < 1) requestAnimationFrame(frame);
    else {
      state.angle = targetBase;
      drawWheel();
      done();
    }
  }

  requestAnimationFrame(frame);
}

function findMember(name) {
  var q = name.trim().toLowerCase();
  return state.members.find(function(m) { return m.name.trim().toLowerCase() === q; });
}

$("spinBtn").addEventListener("click", async function() {
  if (state.spinning) return;
  var member=findMember($("memberName").value);
  if (!member) { $("status").textContent="Không tìm thấy tên này trong lớp."; $("status").className="status error"; return; }
  if (!state.groups.length) { $("status").textContent="Lớp chưa có nhóm."; $("status").className="status error"; return; }
  state.spinning=true; $("spinBtn").disabled=true; $("result").classList.add("hidden"); $("status").textContent="Đang kiểm tra nhóm còn chỗ..."; $("status").className="status";
  try {
    var result=await rpc("assign_member",{p_class_id:state.classData.id,p_member_id:member.id});
    if (!result || result.error) throw new Error(result && result.error==="NO_AVAILABLE_GROUP" ? "Các nhóm mà tên này có xác suất đều đã đầy." : "Không thể chia nhóm. Vui lòng thử lại.");
    var selected=state.groups.find(function(g){return g.id===result.group_id;});
    if (!selected) throw new Error("Không tìm thấy nhóm được trả về.");
    var index=state.groups.findIndex(function(g){return g.id===result.group_id;});
    $("status").textContent="Đang quay...";
    spinToIndex(index,function(){
      $("resultGroup").textContent=selected.name; $("result").classList.remove("hidden");
      $("status").textContent=result.already_assigned ? "Tên này đã được chia vào "+selected.name+"." : "Đã quay xong.";
      $("status").className="status success";
      if (!result.already_assigned) state.counts[selected.id]=result.member_count || ((Number(state.counts[selected.id])||0)+1);
      state.spinning=false; $("spinBtn").disabled=false;
    });
  } catch(e) { $("status").textContent=e.message || "Không thể chia nhóm."; $("status").className="status error"; state.spinning=false; $("spinBtn").disabled=false; }
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
    if (!token) throw new Error("Sai mật khẩu.");
    sessionStorage.setItem("groupPickerAdminToken", token);
    location.href = "admin.html";
  } catch (e) {
    $("loginError").textContent = e.message || "Đăng nhập thất bại.";
  } finally {
    $("loginBtn").disabled = false;
  }
});

loadClass().catch(function(err) {
  $("status").textContent = err.message;
  $("status").className = "status error";
});
