export function updateMeta(selector: string, content: string) {
  const element = document.head.querySelector<HTMLMetaElement>(selector)
  if (element) {
    element.content = content
  }
}

export function updateCanonical(href: string) {
  const element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (element) {
    element.href = href
  }
}

interface PageSeoInput {
  title: string
  description: string
  url: string
}

export function applyPageSeo({ title, description, url }: PageSeoInput) {
  document.title = title
  updateMeta('meta[name="description"]', description)
  updateMeta('meta[property="og:title"]', title)
  updateMeta('meta[property="og:description"]', description)
  updateMeta('meta[property="og:url"]', url)
  updateMeta('meta[name="twitter:title"]', title)
  updateMeta('meta[name="twitter:description"]', description)
  updateCanonical(url)
}
