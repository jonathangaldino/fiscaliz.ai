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

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(publicAgencyValidator, v.null()),
  handler: async (ctx, { slug }) => {
    const doc = await ctx.db
      .query("agencies")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!doc) return null;
    const { _id, name, phone, email, url } = doc;
    return { _id, slug: doc.slug, name, phone, email, url };
  },
});
