export default function Home() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Inventory Management System</h1>
        <p className="text-gray-600 mb-6">
          Manage your inventory across multiple locations with QR code tracking.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="font-semibold text-lg mb-2">Quick Search</h2>
            <p className="text-gray-600 text-sm mb-4">Search for items by name or description</p>
            <a href="/search" className="text-blue-600 hover:text-blue-800">Go to Search →</a>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="font-semibold text-lg mb-2">Scanner</h2>
            <p className="text-gray-600 text-sm mb-4">Check items in and out using QR codes</p>
            <a href="/scanner" className="text-blue-600 hover:text-blue-800">Open Scanner →</a>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="font-semibold text-lg mb-2">Manage Items</h2>
            <p className="text-gray-600 text-sm mb-4">Add and manage inventory items</p>
            <a href="/items" className="text-blue-600 hover:text-blue-800">View Items →</a>
          </div>
        </div>
      </div>
    </div>
  );
}

