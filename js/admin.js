if (sessionStorage.getItem("groupPickerAdmin") !== "1") {
  location.href = "index.html";
}

var d = getData();
var currentIndex = d.currentClass || 0;

function $(id) { return document.getElementById(id); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

function currentClass() {
  return d.classes[currentIndex];
}

function normalize(cls) {
  cls.members.forEach(function(m) {
    if (!m.weights) m.weights = {};
    cls.groups.forEach(function(g) {
      if (typeof m.weights[g.id] !== "number") m.weights[g.id] = 0;
    });
  });
}

function save() {
  d.currentClass = currentIndex;
  saveData(d);
}

function render() {
  var cls = currentClass();
  if (!cls) return;

  normalize(cls);

  $("classSelect").innerHTML = d.classes.map(function(c,i) {
    return '<option value="' + i + '">' + escapeHtml(c.name) + '</option>';
  }).join("");
  $("classSelect").value = currentIndex;

  $("memberList").innerHTML = cls.members.map(function(m) {
    return '<div class="list-row"><span>' + escapeHtml(m.name) + '</span><button class="mini danger" data-del-member="' + m.id + '">Xóa</button></div>';
  }).join("") || '<div class="empty">Chưa có thành viên</div>';

  $("groupList").innerHTML = cls.groups.map(function(g) {
    return '<div class="list-row"><span>' + escapeHtml(g.name) + '</span><button class="mini danger" data-del-group="' + g.id + '">Xóa</button></div>';
  }).join("") || '<div class="empty">Chưa có nhóm</div>';

  $("weightsTable").innerHTML = buildWeightsTable(cls);
  $("historyList").innerHTML = (cls.history || []).map(function(h) {
    return '<div class="history-row"><b>' + escapeHtml(h.name) + '</b><span>→ ' + escapeHtml(h.group) + '</span><small>' + escapeHtml(h.time) + '</small></div>';
  }).join("") || '<div class="empty">Chưa có lịch sử</div>';
}

function buildWeightsTable(cls) {
  if (!cls.members.length || !cls.groups.length) return '<div class="empty">Cần có thành viên và nhóm.</div>';
  var head = '<tr><th>Thành viên</th>' + cls.groups.map(function(g){return '<th>' + escapeHtml(g.name) + '</th>';}).join("") + '<th>Tổng</th></tr>';
  var rows = cls.members.map(function(m) {
    var cells = cls.groups.map(function(g) {
      return '<td><input class="weight" type="number" min="0" max="100" step="1" data-member="' + m.id + '" data-group="' + g.id + '" value="' + (m.weights[g.id] || 0) + '"></td>';
    }).join("");
    return '<tr><td><b>' + escapeHtml(m.name) + '</b></td>' + cells + '<td class="total" data-total="' + m.id + '">0%</td></tr>';
  }).join("");
  return '<div class="table-scroll"><table><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>';
}

function updateTotals() {
  document.querySelectorAll(".total").forEach(function(el) {
    var memberId = el.getAttribute("data-total");
    var total = 0;
    document.querySelectorAll('.weight[data-member="' + memberId + '"]').forEach(function(input) {
      total += Number(input.value) || 0;
    });
    el.textContent = total + "%";
    el.className = "total " + (total === 100 ? "ok" : "bad");
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}

$("classSelect").addEventListener("change", function() {
  currentIndex = Number(this.value);
  save();
  render();
  updateTotals();
});

$("addClassBtn").addEventListener("click", function() {
  var name = $("className").value.trim();
  if (!name) return;
  d.classes.push({id:uid(), name:name, members:[], groups:[], history:[]});
  currentIndex = d.classes.length - 1;
  $("className").value = "";
  save(); render(); updateTotals();
});

$("deleteClassBtn").addEventListener("click", function() {
  if (d.classes.length <= 1) return alert("Phải giữ ít nhất 1 lớp.");
  if (!confirm("Xóa lớp này?")) return;
  d.classes.splice(currentIndex, 1);
  currentIndex = Math.max(0, currentIndex - 1);
  save(); render(); updateTotals();
});

$("addMemberBtn").addEventListener("click", function() {
  var name = $("memberName").value.trim();
  if (!name) return;
  var cls = currentClass();
  var weights = {};
  cls.groups.forEach(function(g, i){ weights[g.id] = i === 0 ? 100 : 0; });
  cls.members.push({id:uid(), name:name, weights:weights});
  $("memberName").value = "";
  save(); render(); updateTotals();
});

$("addGroupBtn").addEventListener("click", function() {
  var name = $("groupName").value.trim();
  if (!name) return;
  var cls = currentClass();
  var g = {id:uid(), name:name};
  cls.groups.push(g);
  cls.members.forEach(function(m){ m.weights[g.id] = 0; });
  $("groupName").value = "";
  save(); render(); updateTotals();
});

$("memberList").addEventListener("click", function(e) {
  var id = e.target.getAttribute("data-del-member");
  if (!id) return;
  currentClass().members = currentClass().members.filter(function(m){return m.id !== id;});
  save(); render(); updateTotals();
});

$("groupList").addEventListener("click", function(e) {
  var id = e.target.getAttribute("data-del-group");
  if (!id) return;
  if (!confirm("Xóa nhóm này?")) return;
  var cls = currentClass();
  cls.groups = cls.groups.filter(function(g){return g.id !== id;});
  cls.members.forEach(function(m){delete m.weights[id];});
  save(); render(); updateTotals();
});

$("saveWeightsBtn").addEventListener("click", function() {
  var cls = currentClass();
  for (var i=0; i<cls.members.length; i++) {
    var m = cls.members[i];
    var total = 0;
    var nw = {};
    for (var j=0; j<cls.groups.length; j++) {
      var g = cls.groups[j];
      var input = document.querySelector('.weight[data-member="' + m.id + '"][data-group="' + g.id + '"]');
      var value = Math.max(0, Math.min(100, Number(input.value) || 0));
      nw[g.id] = value;
      total += value;
    }
    if (total !== 100) {
      alert("Xác suất của \"" + m.name + "\" phải đúng 100%.");
      return;
    }
    m.weights = nw;
  }
  save();
  alert("Đã lưu xác suất.");
});

document.addEventListener("input", function(e) {
  if (e.target.classList.contains("weight")) updateTotals();
});

$("clearHistoryBtn").addEventListener("click", function() {
  if (!confirm("Xóa toàn bộ lịch sử lớp này?")) return;
  currentClass().history = [];
  save(); render();
});

$("logoutBtn").addEventListener("click", function() {
  sessionStorage.removeItem("groupPickerAdmin");
  location.href = "index.html";
});

render();
updateTotals();
