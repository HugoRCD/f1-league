export default defineCachedEventHandler(async () => {
  try {
    const xml = await $fetch<string>('https://www.motorsport.com/rss/f1/news/', {
      responseType: 'text',
    })

    const items: { title: string, description: string, link: string, image: string | null, date: string }[] = []
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? []

    for (const itemXml of itemMatches.slice(0, 8)) {
      const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        ?? itemXml.match(/<title>(.*?)<\/title>/)?.[1]
        ?? ''
      const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] ?? ''
      const description = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
        ?? itemXml.match(/<description>(.*?)<\/description>/)?.[1]
        ?? ''
      const image = itemXml.match(/<enclosure[^>]+url="([^"]+)"/)?.[1]
        ?? itemXml.match(/<media:content[^>]+url="([^"]+)"/)?.[1]
        ?? null
      const date = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ''

      if (title) {
        items.push({
          title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'),
          description: description.replace(/<[^>]*>/g, '').substring(0, 150),
          link,
          image,
          date,
        })
      }
    }

    return items
  } catch {
    return []
  }
}, { maxAge: 900, swr: true, name: 'f1-news' })
