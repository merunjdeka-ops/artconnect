import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-black">

      {/* NAVBAR */}
      <nav className="flex items-center justify-between p-6 border-b">
        <h1 className="text-2xl font-bold">
          LensConnect
        </h1>

        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 rounded-xl border">
            Login
          </Link>

          <Link href="/signup" className="px-4 py-2 rounded-xl bg-black text-white">
            Join Now
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-32">

        <h1 className="text-6xl font-bold max-w-4xl">
          Find The Perfect Photographer For Any Moment
        </h1>

        <p className="mt-6 text-xl text-gray-600 max-w-2xl">
          Discover talented photographers, explore portfolios,
          and connect with professionals based on your style,
          budget, and location.
        </p>

        <div className="flex gap-4 mt-10">

          <Link href="/signup" className="px-6 py-3 rounded-2xl bg-black text-white text-lg">
            Explore Photographers
          </Link>

          <Link href="/signup" className="px-6 py-3 rounded-2xl border text-lg">
            Join As Photographer
          </Link>

        </div>
      </section>

      {/* CATEGORIES */}
      <section className="px-10 pb-20">

        <h2 className="text-3xl font-bold mb-10 text-center">
          Popular Categories
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

          {/* Wedding */}
          <div className="border rounded-3xl p-8 hover:shadow-lg transition cursor-pointer">
            <h3 className="text-2xl font-bold">
              Wedding
            </h3>
            <p className="mt-4 text-gray-600">
              Find photographers for weddings and events.
            </p>
          </div>

          {/* Fashion */}
          <div className="border rounded-3xl p-8 hover:shadow-lg transition cursor-pointer">
            <h3 className="text-2xl font-bold">
              Fashion
            </h3>
            <p className="mt-4 text-gray-600">
              Discover creative fashion photographers.
            </p>
          </div>

          {/* Portrait */}
          <div className="border rounded-3xl p-8 hover:shadow-lg transition cursor-pointer">
            <h3 className="text-2xl font-bold">
              Portrait
            </h3>
            <p className="mt-4 text-gray-600">
              Book portrait and personal shoots.
            </p>
          </div>

          {/* Product Photography */}
          <div className="border rounded-3xl p-8 hover:shadow-lg transition cursor-pointer">
            <h3 className="text-2xl font-bold">
              Product
            </h3>
            <p className="mt-4 text-gray-600">
              Professional product photos for e-commerce and advertising.
            </p>
          </div>

          {/* Documentary */}
          <div className="border rounded-3xl p-8 hover:shadow-lg transition cursor-pointer">
            <h3 className="text-2xl font-bold">
              Documentary
            </h3>
            <p className="mt-4 text-gray-600">
              Real-life storytelling through candid photography.
            </p>
          </div>

          {/* Landscape */}
          <div className="border rounded-3xl p-8 hover:shadow-lg transition cursor-pointer">
            <h3 className="text-2xl font-bold">
              Landscape
            </h3>
            <p className="mt-4 text-gray-600">
              Breathtaking nature and outdoor scenery photography.
            </p>
          </div>

          {/* Wildlife */}
          <div className="border rounded-3xl p-8 hover:shadow-lg transition cursor-pointer">
            <h3 className="text-2xl font-bold">
              Wildlife
            </h3>
            <p className="mt-4 text-gray-600">
              Capture animals in their natural habitats.
            </p>
          </div>

          {/* Sports */}
          <div className="border rounded-3xl p-8 hover:shadow-lg transition cursor-pointer">
            <h3 className="text-2xl font-bold">
              Sports
            </h3>
            <p className="mt-4 text-gray-600">
              Action shots for events, teams, and athletes.
            </p>
          </div>

          {/* Architectural */}
          <div className="border rounded-3xl p-8 hover:shadow-lg transition cursor-pointer">
            <h3 className="text-2xl font-bold">
              Architectural
            </h3>
            <p className="mt-4 text-gray-600">
              Buildings, interiors, and real estate photography.
            </p>
          </div>

          {/* Food */}
          <div className="border rounded-3xl p-8 hover:shadow-lg transition cursor-pointer">
            <h3 className="text-2xl font-bold">
              Food
            </h3>
            <p className="mt-4 text-gray-600">
              Delicious food photography for restaurants and blogs.
            </p>
          </div>

          {/* Event */}
          <div className="border rounded-3xl p-8 hover:shadow-lg transition cursor-pointer">
            <h3 className="text-2xl font-bold">
              Event
            </h3>
            <p className="mt-4 text-gray-600">
              Corporate events, parties, and celebrations.
            </p>
          </div>

          {/* Street Photography */}
          <div className="border rounded-3xl p-8 hover:shadow-lg transition cursor-pointer">
            <h3 className="text-2xl font-bold">
              Street
            </h3>
            <p className="mt-4 text-gray-600">
              Urban life and candid moments in public spaces.
            </p>
          </div>

          {/* Fine Art */}
          <div className="border rounded-3xl p-8 hover:shadow-lg transition cursor-pointer">
            <h3 className="text-2xl font-bold">
              Fine Art
            </h3>
            <p className="mt-4 text-gray-600">
              Creative and artistic photography for galleries.
            </p>
          </div>

          {/* Newborn & Baby */}
          <div className="border rounded-3xl p-8 hover:shadow-lg transition cursor-pointer">
            <h3 className="text-2xl font-bold">
              Newborn & Baby
            </h3>
            <p className="mt-4 text-gray-600">
              Cherish precious moments of yourlittle one.
            </p>
          </div>

          {/* Family */}
          <div className="border rounded-3xl p-8 hover:shadow-lg transition cursor-pointer">
            <h3 className="text-2xl font-bold">
              Family
            </h3>
            <p className="mt-4 text-gray-600">
              Group portraits and family session photography.
            </p>
          </div>

          {/* Automotive */}
          <div className="border rounded-3xl p-8 hover:shadow-lg transition cursor-pointer">
            <h3 className="text-2xl font-bold">
              Automotive
            </h3>
            <p className="mt-4 text-gray-600">
              Cars, motorcycles, and vehicle photography.
            </p>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t py-8 text-center text-gray-600">
        <p>© 2026 LensConnect. All rights reserved.</p>
      </footer>

    </main>
  );
}