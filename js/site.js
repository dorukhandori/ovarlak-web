const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const sections = [...document.querySelectorAll("[data-stop]")];
const chapters = document.querySelectorAll(".chapter");
const railLinks = [...document.querySelectorAll(".rail a")];
const bar = document.querySelector(".progress");

function setActive(id) {
  for (const link of railLinks) link.classList.toggle("active", link.hash === `#${id}`);
}

// The Lotophagoi medallion plays its preview while that chapter is on screen.
function preview(section, on) {
  const medal = section.querySelector(".medal");
  const video = medal?.querySelector("video");
  if (!video || prefersReduced()) return;
  medal.classList.toggle("playing", on);
  if (on) video.play().catch(() => medal.classList.remove("playing"));
  else video.pause();
}

function watchChapters() {
  if (!("IntersectionObserver" in window)) {
    chapters.forEach((c) => c.classList.add("in-view"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const on = entry.isIntersecting;
        if (on) {
          entry.target.classList.add("in-view");
          setActive(entry.target.id);
        }
        preview(entry.target, on);
      }
    },
    { rootMargin: "-35% 0px -35% 0px" },
  );
  chapters.forEach((c) => observer.observe(c));
}

function watchProgress() {
  let queued = false;
  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar?.style.setProperty("--p", max > 0 ? (window.scrollY / max).toFixed(4) : "0");
    if (window.scrollY < window.innerHeight * 0.5) setActive("");
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}

async function startWorld() {
  const canvas = document.querySelector("#world");
  if (prefersReduced() || !canvas) {
    document.body.classList.add("is-static");
    return;
  }
  try {
    const { createWorld } = await import("./world.js");
    createWorld(canvas, sections);
  } catch {
    document.body.classList.add("is-static");
  }
}

watchChapters();
watchProgress();
startWorld();
