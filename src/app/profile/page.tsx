import { Reveal } from "@/components/glass";
import { UserProfilePanel } from "@/components/product";
import { fmt } from "@/lib/data";

const orders = [
  { n: "№ 1042", date: "12 ноября", status: "Выдан", sum: 7400 },
  { n: "№ 0987", date: "28 октября", status: "Выдан", sum: 5900 },
  { n: "№ 0931", date: "3 октября", status: "Возврат", sum: 2800 },
];

export default function ProfilePage() {
  return (
    <div className="page">
      <Reveal className="profile">
        <UserProfilePanel expanded />
        <section id="orders" className="glass-light panel" style={{ padding: 28 }}>
          <h1 className="display h2" style={{ marginBottom: 12 }}>История заказов</h1>
          {orders.map((o) => (
            <div key={o.n} className="order-row">
              <div><b>{o.n}</b><div className="small muted">{o.date}</div></div>
              <div className="small muted" style={{ alignSelf: "center" }}>{o.status}</div>
              <b style={{ alignSelf: "center" }}>{fmt(o.sum)}</b>
            </div>
          ))}
        </section>
      </Reveal>
    </div>
  );
}
