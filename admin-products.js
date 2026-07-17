import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
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
        imageBase64,
        imageType,
      } = req.body;

      let image_url = null;

      if (imageBase64) {
        const buffer = Buffer.from(imageBase64, "base64");
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from("product-images")
          .upload(fileName, buffer, {
            contentType: imageType || "image/jpeg",
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabaseAdmin.storage
          .from("product-images")
          .getPublicUrl(fileName);

        image_url = publicUrlData.publicUrl;
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
