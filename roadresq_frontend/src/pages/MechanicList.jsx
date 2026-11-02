import { useEffect, useState } from 'react';
import { Info, MapPin, Star } from 'lucide-react';
import Button from '../components/ui/Button';
import { Avatar } from '../components/ui/Misc';

// NOTE: placeholder listings — the backend has no mechanic directory/geo search yet.
const dummyMechanics = [
  {
    id: 1,
    name: "Ravi Mech Works",
    serviceType: "Bike, Car",
    rating: 4.5,
    distance: "2.1 km",
  },
  {
    id: 2,
    name: "Highway Auto Fix",
    serviceType: "Car",
    rating: 4.2,
    distance: "3.4 km",
  },
  {
    id: 3,
    name: "24x7 Tow Service",
    serviceType: "Truck, Car",
    rating: 4.7,
    distance: "5.0 km",
  },
];

const MechanicList = () => {
  const [mechanics, setMechanics] = useState([]);

  useEffect(() => {
    // Later: Fetch mechanics from backend using user location
    setMechanics(dummyMechanics);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-3xl font-bold text-ink-950">Nearby mechanics</h1>
      <div className="mt-4">
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info size={16} className="mt-0.5 shrink-0" />
          Sample listings for preview only, not live data. To get real help, send a request and available mechanics will be alerted.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mechanics.map((mech) => (
          <div key={mech.id} className="card p-5">
            <div className="flex items-center gap-3">
              <Avatar name={mech.name} tone="volt" />
              <div>
                <h2 className="font-semibold text-ink-900">{mech.name}</h2>
                <p className="text-sm text-ink-500">{mech.serviceType}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm text-ink-600">
              <span className="flex items-center gap-1"><MapPin size={14} /> {mech.distance}</span>
              <span className="flex items-center gap-1"><Star size={14} className="text-amber-500" /> {mech.rating}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Button to="/help">Request assistance</Button>
      </div>
    </div>
  );
};

export default MechanicList;
