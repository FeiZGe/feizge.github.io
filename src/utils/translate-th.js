document.addEventListener("DOMContentLoaded", () => {
  // Graph View
  const graph = document.querySelector(".slsg-graph-panel h2");
  if (graph) graph.textContent = "มุมมองกราฟ";

  // On this page
  const onThisPage = document.querySelector("#starlight__on-this-page");
  if (onThisPage) onThisPage.textContent = "ในหน้านี้";

  // Overview
  document.querySelectorAll("starlight-toc nav a span").forEach(span => {
    if (span.textContent.trim() === "Overview") {
      span.textContent = "ภาพรวม";
    }
  });
});
