var token = sessionStorage.getItem("groupPickerAdminToken");

if (!token) location.href = "index.html";

var $ = function(id) { return document.getElementById(id); };
var esc = function(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
};

async function admin(action, payload) {
  var data = await rpc("admin_api", {
    p_token: token,
    p_action: action,
    p_payload: payload || {}
  });

  if (data && data.error === "INVALID_SESSION") {
    sessionStorage.removeItem("groupPickerAdminToken");
    location.href = "index.html";
  }

  return data;
}

var classes = [];
var cls = null;
var groups = [];
var members = [];

async function load() {
  classes = await admin("classes_list");

  if (!classes.length) {
    cls = null;
    groups = [];
    members = [];
    render();
    $("historyList").innerHTML = "<div class='empty'>Chưa có lớp.</div>";
    return;
  }

  var saved = localStorage.getItem("class_id");
  cls = classes.find(function(c) { return c.id === saved; }) || classes[0];
  localStorage.setItem("class_id", cls.id);

  groups = await admin("groups_list", {class_id: cls.id});
  members = await admin("members_list", {class_id: cls.id});

  var ws = await admin("weights_list", {class_id: cls.id});

  members.forEach(function(m) {
    m.w = {};
    ws.forEach(function(w) {
      if (w.member_id === m.id) m.w[w.group_id] = Number(w.percent);
    });
  });

  render();
  await loadHistory();
}

function render() {
  $("classSelect").innerHTML = classes.map(function(c) {
    return "<option value='" + c.id + "'>" + esc(c.name) + "</option>";
  }).join("");

  if (cls) $("classSelect").value = cls.id;

  $("memberList").innerHTML = members.length
    ? members.map(function(m) {
        return "<div class='list-row'><span>" + esc(m.name) +
          "</span><button class='mini' data-edit-m='" + m.id + "'>Sửa</button>" +
          "<button class='mini red' data-del-m='" + m.id + "'>Xóa</button></div>";
      }).join("")
    : "<div class='empty'>Chưa có thành viên.</div>";

  $("groupList").innerHTML = groups.length
    ? groups.map(function(g) {
        return "<div class='list-row group-row'><span><b>" + esc(g.name) + "</b><small>Giới hạn: " + (Number(g.max_members) > 0 ? Number(g.max_members) + " người" : "Không giới hạn") + "</small></span><button class='mini' data-edit-g='" + g.id + "'>Sửa</button>" +
          "<button class='mini red' data-del-g='" + g.id + "'>Xóa</button></div>";
      }).join("")
    : "<div class='empty'>Chưa có nhóm.</div>";

  if (!members.length || !groups.length) {
    $("weightsTable").innerHTML = "<div class='empty'>Cần có thành viên và nhóm.</div>";
    return;
  }

  $("weightsTable").innerHTML =
    "<div class='table-scroll'><table><tr><th>Thành viên</th>" +
    groups.map(function(g) { return "<th>" + esc(g.name) + "</th>"; }).join("") +
    "<th>Tổng</th></tr>" +
    members.map(function(m) {
      return "<tr><td><b>" + esc(m.name) + "</b></td>" +
        groups.map(function(g) {
          return "<td><input class='weight' data-m='" + m.id +
            "' data-g='" + g.id +
            "' type='number' min='0' max='100' step='0.01' value='" +
            (m.w[g.id] || 0) + "'></td>";
        }).join("") +
        "<td class='total' data-total='" + m.id + "'>0%</td></tr>";
    }).join("") +
    "</table></div>";

  totals();
}

function totals() {
  document.querySelectorAll(".total").forEach(function(x) {
    var t = 0;
    document.querySelectorAll(".weight[data-m='" + x.dataset.total + "']").forEach(function(i) {
      t += Number(i.value) || 0;
    });

    t = Math.round(t * 100) / 100;
    x.textContent = t + "%";
    x.className = "total " + (t === 100 ? "ok" : "bad");
  });
}

async function loadHistory() {
  if (!cls) {
    $("historyList").innerHTML = "<div class='empty'>Chưa có lớp.</div>";
    return;
  }

  var r = await admin("history_list", {class_id: cls.id});

  $("historyList").innerHTML = r.length
    ? r.map(function(x) {
        return "<div class='history-row'><b>" + esc(x.member_name || "?") +
          "</b><span>→ " + esc(x.group_name || "?") +
          "</span><small>" + new Date(x.created_at).toLocaleString("vi-VN") +
          "</small></div>";
      }).join("")
    : "<div class='empty'>Chưa có lịch sử.</div>";
}

$("classSelect").onchange = async function() {
  cls = classes.find(function(c) { return c.id === $("classSelect").value; });
  localStorage.setItem("class_id", cls.id);
  await load();
};

$("addClassBtn").onclick = async function() {
  var name = $("className").value.trim();
  if (!name) return;

  await admin("class_add", {name: name});
  $("className").value = "";
  await load();
};

$("deleteClassBtn").onclick = async function() {
  if (!cls) return;

  if (confirm("Xóa lớp và toàn bộ dữ liệu của lớp này?")) {
    await admin("class_delete", {id: cls.id});
    localStorage.removeItem("class_id");
    await load();
  }
};

$("addMemberBtn").onclick = async function() {
  if (!cls) return;

  var name = $("memberName").value.trim();
  if (!name) return;

  await admin("member_add", {class_id: cls.id, name: name});
  $("memberName").value = "";
  await load();
};

$("addGroupBtn").onclick = async function() {
  if (!cls) return;

  var name = $("groupName").value.trim();
  if (!name) return;

  var limitText = prompt("Số thành viên tối đa (0 = không giới hạn):", "0");
  if (limitText === null) return;
  var max_members = Math.max(0, Math.floor(Number(limitText) || 0));

  await admin("group_add", {class_id: cls.id, name: name, max_members: max_members});
  $("groupName").value = "";
  await load();
};

$("memberList").onclick = async function(e) {
  var id = e.target.dataset.editM || e.target.dataset.delM;

  if (e.target.dataset.editM) {
    var m = members.find(function(x) { return x.id === id; });
    var n = prompt("Tên thành viên:", m.name);

    if (n && n.trim()) {
      await admin("member_update", {id: id, name: n.trim()});
      await load();
    }
  } else if (e.target.dataset.delM && confirm("Xóa thành viên?")) {
    await admin("member_delete", {id: id});
    await load();
  }
};

$("groupList").onclick = async function(e) {
  var id = e.target.dataset.editG || e.target.dataset.delG;

  if (e.target.dataset.editG) {
    var g = groups.find(function(x) { return x.id === id; });
    var n = prompt("Tên nhóm:", g.name);

    if (n && n.trim()) {
      var limitText = prompt("Số thành viên tối đa (0 = không giới hạn):", Number(g.max_members) || 0);
      if (limitText === null) return;
      var limit = Math.max(0, Math.floor(Number(limitText) || 0));
      await admin("group_update", {id: id, name: n.trim(), max_members: limit});
      await load();
    }
  } else if (e.target.dataset.delG && confirm("Xóa nhóm?")) {
    await admin("group_delete", {id: id});
    await load();
  }
};

$("saveWeightsBtn").onclick = async function() {
  var rows = [];

  for (var m of members) {
    var total = 0;

    for (var g of groups) {
      var input = document.querySelector(
        ".weight[data-m='" + m.id + "'][data-g='" + g.id + "']"
      );

      var value = Math.max(0, Math.min(100, Number(input.value) || 0));
      value = Math.round(value * 100) / 100;
      total += value;

      rows.push({
        member_id: m.id,
        group_id: g.id,
        percent: value
      });
    }

    total = Math.round(total * 100) / 100;

    if (total !== 100) {
      alert(m.name + " phải có tổng xác suất đúng 100%.");
      return;
    }
  }

  await admin("weights_save", {rows: rows});
  alert("Đã lưu xác suất.");
  await load();
};

document.addEventListener("input", function(e) {
  if (e.target.classList.contains("weight")) totals();
});

$("clearHistoryBtn").onclick = async function() {
  if (cls && confirm("Xóa toàn bộ lịch sử của lớp này?")) {
    await admin("history_delete", {class_id: cls.id});
    await loadHistory();
  }
};

$("logoutBtn").onclick = function() {
  sessionStorage.removeItem("groupPickerAdminToken");
  location.href = "index.html";
};

load().catch(function(e) {
  $("historyList").innerHTML = "<div class='empty'>" + esc(e.message) + "</div>";
});


$("clearHistoryBtn").onclick = async function() {
  if (!cls) return;
  if (!confirm("Xóa toàn bộ lịch sử của lớp này?")) return;
  await admin("history_delete", {class_id: cls.id});
  await load();
};

$("logoutBtn").onclick = function() {
  sessionStorage.removeItem("groupPickerAdminToken");
  location.href = "index.html";
};
