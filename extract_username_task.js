module.exports = {
  url: "https://www.instagram.com/elvish_yadav/followers/",

  tasks: [
    { action: "wait", delay: 3000 },
    {
      action: "scrollAndCollect",
      selector: "html", // scroll container
      extractSelector: "main a span[dir='auto']", // what to extract
      scrollAmount: 500,
      iterations: 5, // increase for more users
      delay: 1000,
      saveTo: "users.js",
    },
    { action: "refresh", delay: 5000 },
    {
      action: "scrollAndCollect",
      selector: "html", // scroll container
      extractSelector: "main a span[dir='auto']", // what to extract
      scrollAmount: 500,
      iterations: 5, // increase for more users
      delay: 1000,
      saveTo: "users.js",
    },
    { action: "refresh", delay: 5000 },
    {
      action: "scrollAndCollect",
      selector: "html", // scroll container
      extractSelector: "main a span[dir='auto']", // what to extract
      scrollAmount: 500,
      iterations: 5, // increase for more users
      delay: 1000,
      saveTo: "users.js",
    },
    { action: "close" }
  ],
};
