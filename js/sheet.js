/* Google Sheet loader. Reads the CSV links you put in SHEET (js/data.js) and replaces the
   built-in lists with what is in your sheet. If a link is empty or fails, the site keeps
   using the data in data.js, so it never shows a blank page.
   How to publish a tab: Google Sheets > File > Share > Publish to web > pick the tab > CSV > Publish. */
(function () {
  "use strict";
  var CACHE_KEY = "blab-sheet-v1";

  function parseCSV(text) {
    var rows = [],
      row = [],
      cell = "",
      q = false,
      i,
      c;
    text = String(text || "").replace(/^﻿/, "");
    for (i = 0; i < text.length; i++) {
      c = text.charAt(i);
      if (q) {
        if (c === '"') {
          if (text.charAt(i + 1) === '"') {
            cell += '"';
            i++;
          } else q = false;
        } else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") {
        row.push(cell);
        cell = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text.charAt(i + 1) === "\n") i++;
        row.push(cell);
        cell = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else cell += c;
    }
    row.push(cell);
    if (row.length > 1 || row[0] !== "") rows.push(row);
    return rows;
  }
  function norm(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9:|]+/g, "");
  }
  function table(rows) {
    if (!rows.length) return [];
    var head = rows[0].map(norm);
    return rows.slice(1).map(function (r) {
      var o = {};
      head.forEach(function (h, i) {
        if (h) o[h] = (r[i] || "").trim();
      });
      return o;
    });
  }
  function pick(o, names) {
    for (var i = 0; i < names.length; i++) if (o[names[i]]) return o[names[i]];
    return "";
  }
  function yes(v) {
    return /^(p|y|yes|1|x|true|done|present|✓|✔)$/i.test(String(v || "").trim());
  }
  function trackKey(v) {
    v = String(v || "")
      .trim()
      .toLowerCase();
    var k = Object.keys(TRACKS),
      i;
    for (i = 0; i < k.length; i++) if (k[i] === v || TRACKS[k[i]].name.toLowerCase() === v) return k[i];
    for (i = 0; i < k.length; i++) if (v && (TRACKS[k[i]].name.toLowerCase().indexOf(v) >= 0 || v.indexOf(k[i]) === 0)) return k[i];
    return k[k.length - 1];
  }
  function status(v) {
    v = String(v || "").toLowerCase();
    if (/live|online|launched/.test(v)) return "live";
    if (/prog|wip|work|build|doing/.test(v)) return "wip";
    return "todo";
  }

  function mapPeople(rows) {
    var out = table(rows)
      .map(function (o) {
        var name = pick(o, ["name", "n", "studentname"]);
        if (!name) return null;
        var k = {};
        [
          ["fiverr", ["fiverr"]],
          ["upwork", ["upwork"]],
          ["fl", ["fl", "freelancer"]],
          ["pph", ["pph", "peopleperhour"]],
          ["fb", ["fb", "facebook"]],
          ["ig", ["ig", "instagram"]],
          ["li", ["li", "linkedin"]],
          ["be", ["be", "behance"]],
          ["yt", ["yt", "youtube"]],
          ["gh", ["gh", "github"]],
          ["wa", ["wa", "whatsapp"]],
          ["web", ["web", "website"]],
        ].forEach(function (p) {
          var v = pick(o, p[1]);
          if (v) k[p[0]] = v;
        });
        var skills = pick(o, ["skills", "s"])
          .split(/[;|,]/)
          .map(function (x) {
            return x.trim();
          })
          .filter(Boolean);
        return {
          f: pick(o, ["photo", "f", "image"]),
          n: name,
          t: trackKey(pick(o, ["track", "t", "course"])),
          r: pick(o, ["headline", "r", "role"]) || "B-lab student",
          s: skills.length ? skills : [TRACKS[trackKey(pick(o, ["track", "t"]))].tools[0]],
          p: pick(o, ["project", "p"]) || "First project",
          st: status(pick(o, ["status", "st"])),
          b: pick(o, ["bio", "b"]) || "Learning and building with the B-lab 8th batch.",
          l: pick(o, ["link", "l", "portfolio"]),
          k: k,
          w: yes(pick(o, ["firstclient", "w", "star"])),
        };
      })
      .filter(Boolean);
    return out.length ? out : null;
  }
  function mapNotices(rows) {
    var out = table(rows)
      .map(function (o) {
        var title = pick(o, ["title"]);
        if (!title) return null;
        return {
          d: pick(o, ["date", "d"]),
          time: pick(o, ["time"]),
          title: title,
          text: pick(o, ["text", "details"]),
          tag: pick(o, ["tag"]) || "Update",
          kind: pick(o, ["kind"]).toLowerCase(),
        };
      })
      .filter(Boolean);
    return out.length ? out : null;
  }
  function idxOf(people, o) {
    var roll = parseInt(pick(o, ["roll", "id", "student"]), 10);
    if (roll >= 1 && roll <= people.length) return roll - 1;
    var nm = pick(o, ["name", "studentname", "student"]).toLowerCase();
    for (var i = 0; i < people.length; i++) if (people[i].n.toLowerCase() === nm) return i;
    return -1;
  }
  function mapTracker(rows, people) {
    if (rows.length < 2) return null;
    var head = rows[0].map(function (h) {
      return String(h || "").trim();
    });
    var classes = [],
      work = [],
      cols = [];
    head.forEach(function (h, i) {
      var m = /^(class|hw)\s*:\s*(.+)$/i.exec(h);
      if (!m) return;
      var parts = m[2].split("|"),
        item = { t: parts[0].trim(), d: (parts[1] || "").trim() };
      if (m[1].toLowerCase() === "class") {
        classes.push(item);
        cols.push(["c", i]);
      } else {
        work.push({ t: item.t, due: item.d });
        cols.push(["w", i]);
      }
    });
    if (!classes.length && !work.length) return null;
    var res = people.map(function () {
      return { att: new Array(classes.length + 1).join("A"), sub: new Array(work.length + 1).join("0") };
    });
    var hn = head.map(norm);
    rows.slice(1).forEach(function (r) {
      var o = {};
      hn.forEach(function (h, i) {
        if (h) o[h] = (r[i] || "").trim();
      });
      var idx = idxOf(people, o);
      if (idx < 0) return;
      var a = [],
        s = [];
      cols.forEach(function (c) {
        (c[0] === "c" ? a : s).push(yes(r[c[1]]) ? (c[0] === "c" ? "P" : "1") : c[0] === "c" ? "A" : "0");
      });
      res[idx] = { att: a.join(""), sub: s.join("") };
    });
    return { classes: classes, work: work, rows: res };
  }
  function mapStories(rows, people) {
    var out = table(rows)
      .map(function (o) {
        var quote = pick(o, ["quote", "story", "review"]);
        if (!quote) return null;
        var idx = idxOf(people, o);
        return {
          s: idx,
          client: pick(o, ["client", "clientname"]),
          quote: quote,
          result: pick(o, ["result", "outcome"]),
          stars: Math.max(0, Math.min(5, parseInt(pick(o, ["stars", "rating"]), 10) || 0)),
        };
      })
      .filter(Boolean);
    return out.length ? out : null;
  }

  function fetchText(url) {
    return new Promise(function (res, rej) {
      var done = false;
      var t = setTimeout(function () {
        if (!done) {
          done = true;
          rej(new Error("timeout"));
        }
      }, 9000);
      fetch(url, { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("http " + r.status);
          return r.text();
        })
        .then(function (x) {
          if (!done) {
            done = true;
            clearTimeout(t);
            res(x);
          }
        })
        .catch(function (e) {
          if (!done) {
            done = true;
            clearTimeout(t);
            rej(e);
          }
        });
    });
  }

  function apply(d) {
    if (d.people) window.PEOPLE = d.people;
    if (d.notices) window.NOTICES = d.notices;
    if (d.tracker) window.TRACKER = d.tracker;
    if (d.stories) window.STORIES = d.stories;
  }
  function cacheGet() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    } catch (e) {
      return null;
    }
  }
  function cacheSet(d) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(d));
    } catch (e) {}
  }

  window.BlabSheet = {
    parseCSV: parseCSV,
    enabled: function () {
      var s = window.SHEET || {};
      return !!(s.people || s.notices || s.tracker || s.stories);
    },
    /* Sync: use the last good copy so the page paints with fresh data straight away. */
    applyCache: function () {
      if (!this.enabled()) return;
      var c = cacheGet();
      if (c) apply(c);
    },
    /* Async: fetch the latest, apply it, then call done(true) so the page can redraw. */
    refresh: function (done) {
      var s = window.SHEET || {};
      if (!this.enabled()) return;
      var jobs = ["people", "notices", "tracker", "stories"].map(function (k) {
        return s[k]
          ? fetchText(s[k])
              .then(function (t) {
                return parseCSV(t);
              })
              .catch(function () {
                return null;
              })
          : Promise.resolve(null);
      });
      Promise.all(jobs)
        .then(function (r) {
          var d = {};
          d.people = r[0] ? mapPeople(r[0]) : null;
          var people = d.people || window.PEOPLE;
          d.notices = r[1] ? mapNotices(r[1]) : null;
          d.tracker = r[2] ? mapTracker(r[2], people) : null;
          d.stories = r[3] ? mapStories(r[3], people) : null;
          if (!d.people && !d.notices && !d.tracker && !d.stories) return;
          var old = cacheGet() || {};
          ["people", "notices", "tracker", "stories"].forEach(function (k) {
            if (!d[k] && old[k]) d[k] = old[k];
          });
          cacheSet(d);
          apply(d);
          done(true);
        })
        .catch(function () {});
    },
  };
})();
