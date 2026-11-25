import type { APIRoute } from 'astro';
import models from '../../../data/models.json';

export const GET: APIRoute = () => {
  const gallery: Record<string, string[]> = {};
  for (const model of models) {
    if (model.catalogHidden) continue;
    if (model.variants?.length) {
      for (const variant of model.variants) {
        if (variant.gallery?.length > 1) {
          gallery[`${model.slug}--${variant.key}`] = variant.gallery.slice(1).map(photo => photo.image);
        }
      }
    }
    if (model.gallery?.length > 1) {
      gallery[model.slug] = model.gallery.slice(1).map(photo => photo.image);
    }
  }
  return new Response(JSON.stringify(gallery), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
