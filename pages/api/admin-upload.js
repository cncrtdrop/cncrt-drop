import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

function checkAuth(req) {
  const password = req.headers["x-admin-password"];
  return password && password === process.env.ADMIN_PASSWORD;
}

export default async function handler(req, res) {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non supportée" });
  }

  try {
    const { images } = req.body; // [{ imageBase64, imageType }]
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Aucune image reçue" });
    }

    const urls = [];
    for (const img of images) {
      if (!img.imageBase64) continue;
      const buffer = Buffer.from(img.imageBase64, "base64");
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("product-images")
        .upload(fileName, buffer, {
          contentType: img.imageType || "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabaseAdmin.storage
        .from("product-images")
        .getPublicUrl(fileName);

      urls.push(publicUrlData.publicUrl);
    }

    return res.status(200).json({ urls });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
