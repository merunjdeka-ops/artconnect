import Link from "next/link";

const categories = [
  { name: "Photography", icon: "📷", description: "Portrait, wedding, events, commercial and more." },
  { name: "Music", icon: "🎵", description: "Live performers, session musicians, singers and bands." },
  { name: "Makeup Artist", icon: "💄", description: "Bridal, editorial, special effects and everyday glam." },
  { name: "Painting", icon: "🎨", description: "Custom paintings, murals, portraits and abstract art." },
  { name: "Illustration", icon: "✏️", description: "Digital and hand-drawn illustrations for any project." },
  { name: "Videography", icon: "🎬", description: "Event coverage, short films, music videos and reels." },
  { name: "DJ", icon: "🎧", description: "Events, weddings, parties and private bookings." },
  { name: "Dance", icon: "💃", description: "Choreographers, dance instructors and performers." },
  { name: "Hair Styling", icon: "💇", description: "Creative hairstylists for shoots, events and more." },
  { name: "Graphic Design", icon: "🖥️", description: "Logos, branding, posters and visual identity." },
  { name: "Pottery & Ceramics", icon: "🏺", description: "Handcrafted ceramics, custom pieces and workshops." },
  { name: "Sculpture", icon: "🗿", description: "Custom sculptures in wood, clay, metal and stone." },
  { name: "Calligraphy", icon: "🖋️", description: "Wedding invitations, signage and custom lettering." },
  { name: "Fashion Design", icon: "👗", description: "Custom clothing, alterations and costume design." },
  { name: "Tattoo Artist", icon: "🖊️", description: "Custom tattoos and body art across all styles." },
  { name: "Comedy & Stand-Up", icon: "🎤", description: "Comedians and entertainers for events and shows." },
  { name: "Poetry & Spoken Word", icon: "📜", description: "Live performances, commissions and event pieces." },
  { name: "Acting & Theatre", icon: "🎭", description: "Actors, directors and theatre performers." },
  { name: "Jewelry Making", icon: "💍", description: "Handcrafted custom jewelry and accessories." },
  { name: "Interior Design", icon: "🛋️", description: "Artistic interior styling and space transformation." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-black">

      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-8 py-5 border-b">
        <Link href="/" className="text-2xl font-bold tracking-tight">ArtConnect</Link>
        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 rounded-xl border text-sm font-medium">
            Login
          </Link>
          <Link href="/signup" className="px-4 py-2 rounded-xl bg-black text-white text-sm font-medium">
            Join Now
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-28">
        <span className="text-sm font-medium bg-black text-white px-4 py-1 rounded-full mb-6">
          For local artists & creatives
        </span>
        <h1 className="text-6xl font-bold max-w-4xl leading-tight">
          Discover & Book Local Artists Near You
        </h1>
        <p className="mt-6 text-xl text-gray-500 max-w-2xl">
          ArtConnect is where photographers, musicians, makeup artists, painters,
          and every kind of creative talent gets discovered — and where clients
          find the perfect artist for any moment.
        </p>
        <div className="flex gap-4 mt-10">
          <Link href="/signup" className="px-6 py-3 rounded-2xl bg-black text-white text-lg font-medium">
            Find an Artist
          </Link>
          <Link href="/signup" className="px-6 py-3 rounded-2xl border text-lg font-medium">
            Share Your Work
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-10 pb-24 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold mb-12 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <span className="text-4xl">🎨</span>
            <h3 className="text-xl font-bold">Artists Create a Profile</h3>
            <p className="text-gray-500">Upload your photos, music, videos and set your rates — hourly, per session, or sell your work directly.</p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <span className="text-4xl">🔍</span>
            <h3 className="text-xl font-bold">Clients Discover Talent</h3>
            <p className="text-gray-500">Browse by category, location, or style. Find the perfect artist for your event, project, or moment.</p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <span className="text-4xl">🤝</span>
            <h3 className="text-xl font-bold">Connect & Book</h3>
            <p className="text-gray-500">Book a session, buy their work, or hire them for your next event — all in one place.</p>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="px-10 pb-24 bg-gray-50 py-20">
        <h2 className="text-3xl font-bold mb-4 text-center">All Creative Categories</h2>
        <p className="text-center text-gray-500 mb-12 text-lg">Every kind of local talent, one platform.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 max-w-7xl mx-auto">
          {categories.map((cat) => (
            <div
              key={cat.name}
              className="bg-white border rounded-3xl p-6 hover:shadow-lg transition cursor-pointer"
            >
              <span className="text-3xl">{cat.icon}</span>
              <h3 className="text-lg font-bold mt-3">{cat.name}</h3>
              <p className="mt-2 text-gray-500 text-sm">{cat.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOR ARTISTS CTA */}
      <section className="px-10 py-24 text-center">
        <h2 className="text-4xl font-bold max-w-2xl mx-auto">
          Are You a Local Artist? Get Recognized.
        </h2>
        <p className="mt-5 text-gray-500 text-lg max-w-xl mx-auto">
          Create your free profile, upload your work, set your own rates,
          and let clients find you. No middlemen. Your talent, your terms.
        </p>
        <Link
          href="/signup"
          className="inline-block mt-8 px-8 py-4 rounded-2xl bg-black text-white text-lg font-medium"
        >
          Join as an Artist
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="border-t py-8 text-center text-gray-400 text-sm">
        <p>© 2026 ArtConnect. Built to support local artists everywhere.</p>
      </footer>

    </main>
  );
}
