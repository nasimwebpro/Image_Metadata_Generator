window.addEventListener("DOMContentLoaded", () => {
  const savedKey = localStorage.getItem("geminiApiKey");
  if (savedKey) {
    document.getElementById("apiKeyInput").value = savedKey;
  }
});

document.getElementById("apiKeyInput").addEventListener("input", (e) => {
  localStorage.setItem("geminiApiKey", e.target.value.trim());
});

let results = [];

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function processImages() {
  const files = document.getElementById("fileInput").files;
  const apiKey = document.getElementById("apiKeyInput").value.trim();
  const output = document.getElementById("output");
  output.innerHTML = "";

  if (!apiKey) return alert("⚠️ Please enter your Gemini API key!");
  if (!files.length) return alert("⚠️ Please select image files.");

  results = [];
  output.innerHTML = "<p>Processing images...</p>";

  for (const file of files) {
    const base64 = await readFileAsBase64(file);

    const prompt = `
Generate metadata for the uploaded image:
1. Title: 8–15 words.
2. Keywords: 20–35 relevant.
3. Description: 30–40 words.

Format:
Title: ...
Keywords: ...
Description: ...
`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: file.type,
                data: base64,
              },
            },
          ],
        },
      ],
    };

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();

      const text =
        json.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

      const title = (text.match(/Title:\s*(.*)/i)?.[1] || "").trim();
      const keywords = (text.match(/Keywords:\s*(.*)/i)?.[1] || "").trim();
      const description = (text.match(/Description:\s*([\s\S]*)/i)?.[1] || "").trim();

      results.push({ file: file.name, title, keywords, description });

      output.innerHTML += `
        <div class="metadata-block">
          <img src="${URL.createObjectURL(file)}" alt="${file.name}" />
          <p><strong>${file.name}</strong></p>

          <p>
            <strong>Title:</strong>
            <button class="copy-btn" onclick="copyText('title-${results.length - 1}')">Copy</button><br>
            <textarea id="title-${results.length - 1}" readonly>${title}</textarea>
          </p>

          <p>
            <strong>Keywords:</strong>
            <button class="copy-btn" onclick="copyText('keywords-${results.length - 1}')">Copy</button><br>
            <textarea id="keywords-${results.length - 1}" readonly>${keywords}</textarea>
          </p>

          <p>
            <strong>Description:</strong>
            <button class="copy-btn" onclick="copyText('description-${results.length - 1}')">Copy</button><br>
            <textarea id="description-${results.length - 1}" readonly>${description}</textarea>
          </p>
        </div>
      `;
    } catch (e) {
      output.innerHTML += `<p style="color:red;">❌ Error processing ${file.name}: ${e.message}</p>`;
    }
  }
}

function copyText(textareaId) {
  const textarea = document.getElementById(textareaId);
  textarea.select();
  textarea.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(textarea.value).then(() => {
    alert("✅ Copied to clipboard!");
  }).catch(() => {
    alert("❌ Failed to copy.");
  });
}

function downloadCSV() {
  if (!results.length) return alert("⚠️ No data to download!");

  const header = "Image,Title,Keywords,Description\n";
  const rows = results.map((r) =>
    `"${r.file}","${r.title.replace(/"/g, "'")}","${r.keywords.replace(/"/g, "'")}","${r.description.replace(/"/g, "'")}"`
  );
  const csvContent = header + rows.join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "image_metadata.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
