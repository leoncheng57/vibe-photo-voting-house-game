// Routes that predate the multi-app split. Each legacy folder ships an HTML
// stub naming its destination, so a bookmarked or blogged URL still lands in
// the right app instead of 404ing — GitHub Pages cannot issue a real 301.

const destination = document.querySelector<HTMLMetaElement>('meta[name="redirect-to"]')?.content

if (destination) {
  const target = `${import.meta.env.BASE_URL}${destination}${window.location.search}${window.location.hash}`
  window.location.replace(target)
}
