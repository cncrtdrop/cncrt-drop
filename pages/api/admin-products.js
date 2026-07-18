import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "25mb",
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

  if (req.method === "POST") {
    try {
      const {
        brand,
        name,
        description,
        size,
        condition,
        price,
        tag,
        category,
        images, // array of { imageBase64, imageType }
      } = req.body;

      let image_url = null;
      let uploadedUrls = [];

      if (Array.isArray(images) && images.length > 0) {
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

          uploadedUrls.push(publicUrlData.publicUrl);
        }
        image_url = uploadedUrls[0] || null;
      }

      const { data, error } = await supabaseAdmin
        .from("products")
        .insert([
          {
            brand,
            name,
            description,
            size,
            condition,
            price,
            tag: tag || null,
            category,
            image_url,
            images: uploadedUrls,
          },
        ])
        .select();

      if (error) throw error;

      return res.status(200).json({ product: data[0] });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { id } = req.body;
      const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Méthode non supportée" });
}
