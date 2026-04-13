import Link from "next/link";
import { notFound } from "next/navigation";

const DUMMY_COLLABS: Record<string, { id: string; name: string; owner: string; members: string[]; status: string; createdAt: string }> = {
  c1: { id: "c1", name: "Margazhi Concert Prep",     owner: "Lakshmi Narayanan",    members: ["Lakshmi Narayanan","Ravi Krishnamurthy","Anand Subramanian","Meera Venkatesh"], status: "active",    createdAt: "10 Jan 2025" },
  c2: { id: "c2", name: "Thyagaraja Aradhana 2025",  owner: "Ravi Krishnamurthy",   members: ["Ravi Krishnamurthy","Priya Balakrishnan","Suresh Iyer","Karthik Seshadri","Nithya Subramanian","Vijay Anantharaman"], status: "active", createdAt: "20 Jan 2025" },
  c3: { id: "c3", name: "Rotterdam Kutcheri",        owner: "Anand Subramanian",    members: ["Anand Subramanian","Lakshmi Narayanan","Meera Venkatesh"], status: "completed", createdAt: "05 Nov 2024" },
};

const DUMMY_MESSAGES: Record<string, { sender: string; text: string; time: string }[]> = {
  c1: [
    { sender: "Lakshmi Narayanan",  text: "Let us plan the setlist for Margazhi. I am thinking we open with Kalyani.",  time: "10 Jan, 10:00" },
    { sender: "Ravi Krishnamurthy", text: "Sounds great! I can prepare the violin accompaniment for the first 3 pieces.", time: "10 Jan, 10:15" },
    { sender: "Anand Subramanian",  text: "I will handle the mridangam. Should we do a tani avartanam in the middle?",   time: "10 Jan, 10:30" },
    { sender: "Lakshmi Narayanan",  text: "Yes! Let us keep it to 10 minutes. Rehearsal on Saturday at 3pm?",            time: "11 Jan, 09:00" },
    { sender: "Meera Venkatesh",    text: "Saturday works for me. Shall I bring the tambura?",                           time: "11 Jan, 09:45" },
  ],
  c2: [
    { sender: "Ravi Krishnamurthy",     text: "Welcome everyone to the Thyagaraja Aradhana planning group!",            time: "20 Jan, 14:00" },
    { sender: "Priya Balakrishnan",     text: "Excited to be part of this. Which pancharatna kritis are we doing?",     time: "20 Jan, 14:30" },
    { sender: "Nithya Subramanian",     text: "I suggest we do all five. It is a tradition after all.",                  time: "20 Jan, 15:00" },
    { sender: "Suresh Iyer",            text: "Agreed. I will prepare the flute parts for Jagadananda Karaka.",         time: "21 Jan, 10:00" },
  ],
  c3: [
    { sender: "Anand Subramanian",  text: "Great concert everyone! The audience loved the Bhairavi piece.",             time: "05 Nov, 22:00" },
    { sender: "Lakshmi Narayanan",  text: "Thank you all. It was a wonderful evening. Shall we do this again?",         time: "05 Nov, 22:15" },
    { sender: "Meera Venkatesh",    text: "Absolutely! Let us plan for spring.",                                         time: "06 Nov, 09:00" },
  ],
};

export default function AdminCollabDetailPage({ params }: { params: { id: string } }) {
  const collab = DUMMY_COLLABS[params.id];
  if (!collab) notFound();
  const messages = DUMMY_MESSAGES[params.id] ?? [];

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <Link href="/admin/collabs" className="text-sm text-amber-700 hover:text-amber-900 mb-6 inline-block">
        Back to Collabs
      </Link>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">{collab.name}</h1>
            <p className="text-stone-500 text-sm mt-1">Owner: {collab.owner} &middot; Created {collab.createdAt}</p>
          </div>
          <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${collab.status === "active" ? "bg-green-50 text-green-700 border border-green-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
            {collab.status === "active" ? "Active" : "Completed"}
          </span>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800 text-sm mb-6">
          Admins can view all message history. Artists are notified of this.
        </div>

        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 mb-6">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Members ({collab.members.length})</h2>
          <div className="flex flex-wrap gap-2">
            {collab.members.map(m => (
              <span key={m} className="bg-stone-100 text-stone-700 text-xs px-3 py-1 rounded-full font-medium">{m}</span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">Message History ({messages.length})</h2>
          {messages.length === 0 ? (
            <p className="text-stone-400 text-sm italic">No messages yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((msg, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 flex-shrink-0">
                    {msg.sender[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold text-stone-800">{msg.sender}</span>
                      <span className="text-xs text-stone-400">{msg.time}</span>
                    </div>
                    <p className="text-sm text-stone-700 leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
