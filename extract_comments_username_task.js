module.exports = {
  url: "https://www.instagram.com/p/DS2oae0jDOU/comments",

  tasks: [
    { action: "wait", delay: 3000 },
    {
      action: "scrollAndCollect",
      selector: "main",
      x: 105,
      y: 260,
      extractSelector: "main a[role='link'][href^='/']",
      attribute: "href",
      scrollAmount: 1000,
      iterations: 25,
      delay: 2000,
      saveTo: "users.js",
    }
  ],
};
