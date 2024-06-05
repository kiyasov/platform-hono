import autocannon from "autocannon";
import { PassThrough } from "stream";

// Example base64-encoded image (black square 100x100 pixels)
const base64Content =
  "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAABmJLR0QA/wD/AP+gvaeTAAAAJ0lEQVR4nO3BAQEAAACCIP+vbkhAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwH8GAAF3Xq9HAAAAAElFTkSuQmCC";

// Create the request body with the base64 string
const formData = `--boundary
Content-Disposition: form-data; name="file"; filename="square.png"
Content-Type: image/png

${base64Content}
--boundary--`;

// Set up headers
const headers = {
  "Content-Type": "multipart/form-data; boundary=boundary",
  "Content-Length": Buffer.byteLength(formData),
};

const pass = new PassThrough();
pass.end(formData);

const chunks = [];

pass.on("data", (chunk) => chunks.push(chunk));
pass.on("end", () => {
  const formBuffer = Buffer.concat(chunks);
  const instance = autocannon({
    url: "http://localhost:3000/uploadFile",
    method: "POST",
    headers: headers,
    body: formBuffer,
    connections: 200,
    duration: 5,
    pipelining: 10,
  });

  autocannon.track(instance, { renderProgressBar: true });

  process.once("SIGINT", () => {
    instance.stop();
  });
});

pass.on("error", (err) => {
  console.error("Error reading data from the stream", err);
});

pass.resume();
