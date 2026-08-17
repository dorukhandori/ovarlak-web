import { createWorld } from "./world.js";

const prefersReduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const reveal = () => {
  const nodes = document.querySelectorAll("#games .card, .studio p");
  if (!nodes.length) return;
  if (prefersReduced() || !("IntersectionObserver" in window)) {
    nodes.forEach((node) => node.classList.add("in-view"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.2 },
  );
  nodes.forEach((node) => observer.observe(node));
};

const hoverVideo = (root) => {
  if (prefersReduced() || !window.matchMedia("(hover: hover)").matches) return;
  const video = root?.querySelector("video");
  if (!root || !video) return;
  root.addEventListener("mouseenter", () => {
    root.classList.add("playing");
    video.currentTime = 0;
    video.play().catch(() => {});
  });
  root.addEventListener("mouseleave", () => {
    root.classList.remove("playing");
    video.pause();
  });
};

const start = () => {
  const canvas = document.querySelector("#world");
  if (prefersReduced()) {
    document.body.classList.add("is-static");
  } else if (canvas) {
    try {
      createWorld(canvas);
    } catch {
      document.body.classList.add("is-static");
    }
  }

  reveal();
  hoverVideo(document.querySelector(".card.live"));
  hoverVideo(document.querySelector(".float-card"));
};

start();
