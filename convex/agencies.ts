import { v } from "convex/values";
import { query } from "./_generated/server";

export const publicAgencyValidator = v.object({
  _id: v.id("agencies"),
  slug: v.string(),
  name: v.string(),
  phone: v.string(),
  email: v.string(),
  url: v.string(),
});

export const list = query({
  args: {},
  returns: v.array(publicAgencyValidator),
  handler: async (ctx) => {
    const docs = await ctx.db.query("agencies").collect();
    return docs.map(({ _id, slug, name, phone, email, url }) => ({
      _id,
      slug,
      name,
      phone,
      email,
      url,
    }));
  },
});
