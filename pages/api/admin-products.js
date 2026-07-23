import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
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
        imageUrls,
        sort_order,
        published,
      } = req.body;

      const urls = Array.isArray(imageUrls) ? imageUrls : [];

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
            image_url: urls[0] || null,
            images: urls,
            sort_order: sort_order ?? 0,
            published: published ?? true,
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

  if (req.method === "PUT") {
    try {
      const {
        id,
        brand,
        name,
        description,
        size,
        condition,
        price,
        tag,
        category,
        imageUrls,
        sort_order,
        published,
      } = req.body;

      if (!id) return res.status(400).json({ error: "id manquant" });

      const update = {
        brand,
        name,
        description,
        size,
        condition,
        price,
        tag: tag || null,
        category,
      };

      if (sort_order !== undefined) {
        update.sort_order = sort_order;
      }

      if (published !== undefined) {
        update.published = published;
      }

      if (Array.isArray(imageUrls)) {
        update.images = imageUrls;
        update.image_url = imageUrls[0] || null;
      }

      const { data, error } = await supabaseAdmin
        .from("products")
        .update(update)
        .eq("id", id)
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
