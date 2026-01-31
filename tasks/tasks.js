module.exports = {
  url: "https://www.instagram.com/",
  tasks: [
    {
      action: "press",
      key: "Tab",
      search: {
        textContent: "Follows",
        itration: 10,
      },
      delay: 200,
    },
    {
      action: "press",
      key: "Tab",
      search: {
        role: "textbox",
        itration: 20,
      },
      delay: 200,
    },
  ],
};
