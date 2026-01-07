import http from "node:http";

http
  .get("http://localhost:3001/debug/info", (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });
    res.on("end", () => {
      console.log(data);
    });
  })
  .on("error", (err) => {
    console.error("API not reachable:", err.message);
  });
