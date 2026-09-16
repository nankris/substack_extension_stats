// Local, static fallback data. Nothing here is fetched from a network — it exists so the
// UI always has something meaningful to render when live retrieval is unavailable.

import { generateId, daysAgoISO } from "./utils.js";

export const DEFAULT_COLLECTIONS = [
  { id: "col_must_read", name: "Must Read", isDefault: true },
  { id: "col_technology", name: "Technology", isDefault: true },
  { id: "col_business", name: "Business", isDefault: true },
  { id: "col_news", name: "News", isDefault: true },
];

const raw = [
  ["Stratechery", "Ben Thompson", "stratechery.com", "Analysis of the strategy and business side of technology and media.", "Technology", "paid", true, "col_technology", 2],
  ["The Diff", "Byrne Hobart", "thediff.co", "Notes on the intersection of finance and technology, for a technical audience.", "Business", "paid", true, "col_business", 1],
  ["Platformer", "Casey Newton", "platformer.news", "Reporting on the intersection of Silicon Valley and democracy.", "Technology", "paid", false, "col_technology", 3],
  ["Not Boring", "Packy McCormick", "notboring.co", "Business strategy with a sense of humor, three times a week.", "Business", "free", true, "col_must_read", 5],
  ["Lenny's Newsletter", "Lenny Rachitsky", "lennysnewsletter.com", "Practical advice on product, growth and career from a former Airbnb PM.", "Business", "paid", false, "col_business", 2],
  ["The Pragmatic Engineer", "Gergely Orosz", "newsletter.pragmaticengineer.com", "Deep dives on software engineering culture at big tech and startups.", "Technology", "paid", true, "col_technology", 1],
  ["Money Stuff", "Matt Levine", "matt-levine.com", "A wry daily read on finance, markets and the schemes people cook up.", "Business", "free", false, "col_business", 0],
  ["Astral Codex Ten", "Scott Alexander", "astralcodexten.com", "Long-form essays on rationality, science and society.", "Culture", "free", false, "col_must_read", 6],
  ["Garbage Day", "Ryan Broderick", "garbageday.email", "A daily look at internet culture and the algorithms shaping it.", "Culture", "free", false, "col_news", 4],
  ["Heated", "Emily Atkin", "heated.world", "Independent journalism about the climate crisis and who's responsible.", "News", "paid", false, "col_news", 8],
  ["The Browser", "Caroline Crampton", "thebrowser.com", "Five articles worth your time, curated daily from across the web.", "Culture", "paid", true, "col_must_read", 1],
  ["Dense Discovery", "Kai Brach", "densediscovery.com", "A weekly, thoughtfully curated look at design, technology and culture.", "Design", "free", true, "col_must_read", 7],
  ["Benedict's Newsletter", "Benedict Evans", "ben-evans.com", "A weekly take on what matters in tech, mobile and the internet.", "Technology", "free", false, "col_technology", 3],
  ["Read Max", "Max Read", "readmax.com", "Essays on the internet, media and the strange logic of platforms.", "Culture", "paid", false, "col_news", 12],
  ["Construction Physics", "Brian Potter", "constructionphysics.substack.com", "How buildings, infrastructure and industrial systems actually get made.", "Science", "free", true, "col_must_read", 9],
  ["Works in Progress", "Sam Bowman", "worksinprogress.co", "Deep dives on the science and technology of human progress.", "Science", "free", false, "col_technology", 14],
  ["The Generalist", "Mario Gabriele", "generalist.substack.com", "Long-form profiles and analysis of ambitious companies and founders.", "Business", "paid", false, "col_business", 5],
  ["Noahpinion", "Noah Smith", "noahpinion.substack.com", "Economics, tech and political commentary from an economist's lens.", "Business", "paid", true, "col_business", 2],
  ["Import AI", "Jack Clark", "importai.substack.com", "A weekly roundup of what matters in artificial intelligence research.", "Technology", "free", true, "col_technology", 0],
  ["Culture Study", "Anne Helen Petersen", "annehelen.substack.com", "Essays on work, burnout and the culture we build around both.", "Culture", "paid", false, "col_news", 6],
];

export function buildMockSubscriptions() {
  return raw.map(([name, author, domain, description, category, status, favorite, collection, activityDaysAgo], i) => ({
    id: generateId("sub"),
    name,
    author,
    url: `https://${domain}`,
    description,
    category,
    status, // 'free' | 'paid'
    favorite,
    tags: [category.toLowerCase()],
    collection,
    lastActivity: daysAgoISO(activityDaysAgo),
    subscriptionDate: daysAgoISO(30 + i * 11),
    source: "mock",
  }));
}

const articleTitles = [
  "The unbundling nobody saw coming",
  "Why the next decade looks nothing like the last one",
  "A field guide to reading the room",
  "What the data actually says",
  "The quiet migration happening right now",
  "On taste, and why it's getting harder to fake",
  "The incentive problem nobody wants to name",
  "Notes from a very strange quarter",
  "The case for slowing down",
  "Everything is a distribution channel now",
];

export function buildMockReadingList(subscriptions) {
  return articleTitles.map((title, i) => {
    const sub = subscriptions[i % subscriptions.length];
    return {
      id: generateId("art"),
      subscriptionId: sub.id,
      source: sub.name,
      title,
      url: `${sub.url}/p/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      publishedAt: daysAgoISO(i + 1),
      savedAt: daysAgoISO(i),
      status: i % 3 === 0 ? "read" : "unread",
      favorite: i % 4 === 0,
    };
  });
}

export function buildMockActivity(subscriptions) {
  return [
    { id: generateId("act"), type: "subscribe", message: `Subscribed to ${subscriptions[0].name}`, timestamp: daysAgoISO(1) },
    { id: generateId("act"), type: "favorite", message: `Favorited ${subscriptions[3].name}`, timestamp: daysAgoISO(2) },
    { id: generateId("act"), type: "read", message: `Read an article from ${subscriptions[5].name}`, timestamp: daysAgoISO(3) },
    { id: generateId("act"), type: "collection", message: `Added ${subscriptions[8].name} to Must Read`, timestamp: daysAgoISO(5) },
    { id: generateId("act"), type: "subscribe", message: `Subscribed to ${subscriptions[11].name}`, timestamp: daysAgoISO(9) },
  ];
}
