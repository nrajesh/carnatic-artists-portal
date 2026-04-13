// Shared dummy artist data used across public and admin pages.
// Replace with DB queries once Neon is connected.

export type DummyArtist = {
  id: string;
  slug: string;
  name: string;
  email: string;
  province: string;
  specialities: { name: string; color: string }[];
  status: string;
  joinedAt: string;
  contactNumber: string;
  contactType: string;
  availableForCollab: boolean;
  bio: string;
  availabilityDates: { from: string; to: string }[];
  collabs: { id: string; slug: string; name: string; role: string; status: string; closedAt?: string }[];
  reviews: {
    id: string;          // stable review ID, e.g. "rv-lakshmi-ravi-rotterdam"
    reviewerSlug: string; // slug of the artist who wrote this review
    from: string;
    rating: number;
    comment: string;
    collab: string;
    date: string;
  }[];
  links: { type: string; url: string }[];
};

export const DUMMY_ARTISTS: DummyArtist[] = [
  {
    id: "1", slug: "lakshmi-narayanan", name: "Lakshmi Narayanan", email: "lakshmi@example.com",
    province: "Noord-Holland", status: "active", joinedAt: "01 Sep 2024",
    contactNumber: "+31612345678", contactType: "whatsapp", availableForCollab: true,
    specialities: [{ name: "Vocal", color: "#7C3AED" }],
    bio: `<p>Lakshmi Narayanan is a classically trained Carnatic vocalist based in Amsterdam. She began her musical journey at the age of six under the tutelage of Smt. Suguna Varadachari in Chennai, completing a rigorous 15-year training in the Kirana gharana style.</p>
<p>Her repertoire spans the entire gamut of Carnatic music - from the devotional kritis of Tyagaraja and Muthuswami Dikshitar to the complex ragam-tanam-pallavi expositions that showcase her mastery of raga grammar. She is particularly renowned for her rendition of rare ragas such as Nalinakanti, Surutti, and Kambhoji.</p>
<p>Having relocated to The Netherlands in 2018, Lakshmi has been instrumental in building the Carnatic music community in Amsterdam. She performs regularly at the Muziekgebouw aan 't IJ and has collaborated with leading instrumentalists across Europe. She also runs a weekly Carnatic music class for children of the Indian diaspora in Amsterdam.</p>
<p>In 2023, she released her debut album <em>Nada Sudha</em> - a collection of compositions by the Trinity of Carnatic music, recorded live at the Concertgebouw. The album received widespread acclaim from the Carnatic music community worldwide.</p>`,
    availabilityDates: [
      { from: "2025-05-01", to: "2025-05-15" },
      { from: "2025-06-10", to: "2025-06-30" },
      { from: "2025-08-01", to: "2025-08-20" },
    ],
    collabs: [
      { id: "c1", slug: "margazhi-concert-prep",    name: "Margazhi Concert Prep",    role: "Owner",  status: "active" },
      { id: "c3", slug: "rotterdam-kutcheri",       name: "Rotterdam Kutcheri",       role: "Member", status: "completed", closedAt: "Dec 2024" },
      { id: "c5", slug: "veena-flute-jugalbandi",   name: "Veena & Flute Jugalbandi", role: "Member", status: "completed", closedAt: "Jan 2025" },
    ],
    reviews: [
      { id: "rv-lakshmi-ravi-rotterdam",  reviewerSlug: "ravi-krishnamurthy", from: "Ravi Krishnamurthy", rating: 5, comment: "Exceptional vocalist. Her sense of raga and rhythm is impeccable. A pleasure to accompany.", collab: "Rotterdam Kutcheri", date: "15 Dec 2024" },
      { id: "rv-lakshmi-meera-veena",     reviewerSlug: "meera-venkatesh",    from: "Meera Venkatesh",    rating: 5, comment: "Lakshmi brings incredible depth to every performance. Highly recommend collaborating with her.", collab: "Veena & Flute Jugalbandi", date: "20 Jan 2025" },
    ],
    links: [
      { type: "YouTube",   url: "https://youtube.com/@lakshminaaryanan" },
      { type: "Instagram", url: "https://instagram.com/lakshmicarnaticvocal" },
    ],
  },
  {
    id: "2", slug: "ravi-krishnamurthy", name: "Ravi Krishnamurthy", email: "ravi@example.com",
    province: "Zuid-Holland", status: "active", joinedAt: "15 Sep 2024",
    contactNumber: "+31698765432", contactType: "mobile", availableForCollab: true,
    specialities: [{ name: "Violin", color: "#B45309" }],
    bio: `<p>Ravi Krishnamurthy is a Carnatic violinist of international repute, based in Rotterdam. A disciple of the legendary Shri T.N. Krishnan, Ravi has been performing since the age of ten and has accompanied some of the most celebrated vocalists in the Carnatic world, including M.S. Subbulakshmi, Sanjay Subrahmanyan, and T.M. Krishna.</p>
<p>His violin style is characterised by a rich, resonant tone, impeccable intonation, and a deep understanding of raga bhava. He is equally at home in the role of accompanist and soloist, and his solo violin concerts have been described as "meditative journeys through the landscape of Carnatic ragas."</p>
<p>Since moving to The Netherlands in 2015, Ravi has been a cornerstone of the Dutch Carnatic scene, performing at major festivals including the North Sea Jazz Festival and the Amsterdam World Music Festival. He teaches at the Rotterdam Conservatory and has trained over 50 students in the Netherlands.</p>
<p>Ravi is also a composer, having written several original compositions in the Carnatic tradition that blend classical structures with contemporary sensibilities. His composition <em>Neeraja</em> in raga Charukesi has been widely performed by artists across Europe.</p>`,
    availabilityDates: [
      { from: "2025-04-15", to: "2025-04-30" },
      { from: "2025-07-01", to: "2025-07-31" },
    ],
    collabs: [
      { id: "c2", slug: "thyagaraja-aradhana-2025", name: "Thyagaraja Aradhana 2025", role: "Owner",  status: "active" },
      { id: "c3", slug: "rotterdam-kutcheri",       name: "Rotterdam Kutcheri",       role: "Member", status: "completed", closedAt: "Dec 2024" },
    ],
    reviews: [
      { id: "rv-ravi-lakshmi-rotterdam",  reviewerSlug: "lakshmi-narayanan", from: "Lakshmi Narayanan", rating: 5, comment: "Ravi is a master accompanist. His bowing technique and improvisational skills are extraordinary.", collab: "Rotterdam Kutcheri", date: "15 Dec 2024" },
      { id: "rv-ravi-anand-rotterdam",    reviewerSlug: "anand-subramanian", from: "Anand Subramanian", rating: 4, comment: "Great musician and very easy to work with. Would love to collaborate again.", collab: "Rotterdam Kutcheri", date: "16 Dec 2024" },
    ],
    links: [{ type: "YouTube", url: "https://youtube.com/@ravikrishnamurthy" }],
  },
  {
    id: "3", slug: "anand-subramanian", name: "Anand Subramanian", email: "anand@example.com",
    province: "Utrecht", status: "active", joinedAt: "01 Oct 2024",
    contactNumber: "+31611223344", contactType: "whatsapp", availableForCollab: false,
    specialities: [{ name: "Mridangam", color: "#B91C1C" }],
    bio: `<p>Anand Subramanian is a mridangam virtuoso based in Utrecht. He trained under the legendary Shri Umayalpuram K. Sivaraman for over a decade, mastering both the Thanjavur and Pudukkottai styles of mridangam playing.</p>
<p>Anand is known for his extraordinary command of laya (rhythm) and his ability to create complex rhythmic patterns while maintaining perfect synchrony with the main artist. His tani avartanam (solo percussion section) performances are legendary for their creativity and technical brilliance.</p>
<p>Having performed at prestigious venues across Europe and India - including the Madras Music Academy, the Bangalore Gayana Samaja, and the Barbican Centre in London - Anand brings a wealth of concert experience to every collaboration.</p>
<p>In The Netherlands, Anand has been active in promoting Carnatic percussion through workshops and masterclasses. He recently completed a residency at the Utrecht Conservatory where he introduced Carnatic rhythmic concepts to Western classical percussionists.</p>`,
    availabilityDates: [{ from: "2025-05-20", to: "2025-06-05" }],
    collabs: [
      { id: "c3", slug: "rotterdam-kutcheri",     name: "Rotterdam Kutcheri",     role: "Owner",  status: "completed", closedAt: "Dec 2024" },
      { id: "c6", slug: "percussion-ensemble-nl", name: "Percussion Ensemble NL", role: "Member", status: "active" },
    ],
    reviews: [
      { id: "rv-anand-lakshmi-rotterdam", reviewerSlug: "lakshmi-narayanan", from: "Lakshmi Narayanan", rating: 5, comment: "Anand's mridangam playing elevated the entire concert. His tani avartanam was breathtaking.", collab: "Rotterdam Kutcheri", date: "15 Dec 2024" },
    ],
    links: [],
  },
  {
    id: "4", slug: "meera-venkatesh", name: "Meera Venkatesh", email: "meera@example.com",
    province: "Noord-Holland", status: "active", joinedAt: "10 Oct 2024",
    contactNumber: "+31655443322", contactType: "mobile", availableForCollab: true,
    specialities: [{ name: "Veena", color: "#047857" }],
    bio: `<p>Meera Venkatesh is a Carnatic veena artist of rare distinction, based in Haarlem. She trained in the Mysore bani of veena playing under Smt. Jayalakshmi Sekhar, a direct disciple of the legendary Veena Doreswamy Iyengar.</p>
<p>The Mysore bani is characterised by its emphasis on gamaka (ornamental notes), a rich tonal quality, and a deeply meditative approach to raga elaboration. Meera has absorbed these qualities deeply and brings them to life in her performances with a rare combination of technical precision and emotional depth.</p>
<p>Meera performs both as a soloist and in ensemble settings. Her solo veena concerts have been described as "conversations with the divine" by critics, while her ensemble work demonstrates a remarkable ability to blend the veena's unique timbre with other instruments.</p>
<p>Based in Haarlem since 2019, Meera teaches veena to students of all ages and backgrounds. She has developed a unique curriculum that introduces the veena to students with no prior background in Indian classical music, making this ancient instrument accessible to a new generation of Dutch music lovers.</p>`,
    availabilityDates: [
      { from: "2025-04-01", to: "2025-04-20" },
      { from: "2025-09-01", to: "2025-09-30" },
    ],
    collabs: [
      { id: "c5", slug: "veena-flute-jugalbandi", name: "Veena & Flute Jugalbandi", role: "Owner",  status: "completed", closedAt: "Jan 2025" },
      { id: "c1", slug: "margazhi-concert-prep",  name: "Margazhi Concert Prep",    role: "Member", status: "active" },
    ],
    reviews: [
      { id: "rv-meera-suresh-veena",   reviewerSlug: "suresh-iyer",       from: "Suresh Iyer",       rating: 5, comment: "Playing with Meera was a transcendent experience. Her veena and my flute created a beautiful dialogue.", collab: "Veena & Flute Jugalbandi", date: "20 Jan 2025" },
      { id: "rv-meera-lakshmi-margazhi", reviewerSlug: "lakshmi-narayanan", from: "Lakshmi Narayanan", rating: 5, comment: "Meera's veena playing is deeply moving. She has a rare gift for communicating the essence of a raga.", collab: "Margazhi Concert Prep", date: "15 Feb 2025" },
    ],
    links: [{ type: "Instagram", url: "https://instagram.com/meeraveena" }],
  },
  {
    id: "5", slug: "suresh-iyer", name: "Suresh Iyer", email: "suresh@example.com",
    province: "Gelderland", status: "active", joinedAt: "01 Nov 2024",
    contactNumber: "+31677889900", contactType: "whatsapp", availableForCollab: false,
    specialities: [{ name: "Flute", color: "#0369A1" }],
    bio: `<p>Suresh Iyer is a Carnatic flautist based in Nijmegen, Gelderland. He is a disciple of the legendary Shri N. Ramani, widely regarded as one of the greatest Carnatic flautists of the 20th century.</p>
<p>Suresh's flute playing is characterised by a pure, crystalline tone, effortless breath control, and a deeply meditative quality that draws listeners into a state of contemplative stillness. He is particularly known for his renditions of ragas like Bhairavi, Todi, and Kalyani, which he approaches with a rare combination of scholarly depth and emotional spontaneity.</p>
<p>Having performed across India, Europe, and North America, Suresh brings a wealth of concert experience to his collaborations in The Netherlands. He has performed at the Concertgebouw in Amsterdam, the Elbphilharmonie in Hamburg, and the Barbican Centre in London.</p>
<p>In addition to performing, Suresh is deeply committed to music education. He runs a flute school in Nijmegen and has developed a method for teaching Carnatic flute to students from Western classical backgrounds, bridging the gap between two great musical traditions.</p>`,
    availabilityDates: [],
    collabs: [
      { id: "c5", slug: "veena-flute-jugalbandi",   name: "Veena & Flute Jugalbandi",  role: "Member", status: "completed", closedAt: "Jan 2025" },
      { id: "c2", slug: "thyagaraja-aradhana-2025", name: "Thyagaraja Aradhana 2025",  role: "Member", status: "active" },
    ],
    reviews: [
      { id: "rv-suresh-meera-veena", reviewerSlug: "meera-venkatesh", from: "Meera Venkatesh", rating: 5, comment: "Suresh's flute playing is ethereal. The jugalbandi we performed together was one of the highlights of my musical career.", collab: "Veena & Flute Jugalbandi", date: "20 Jan 2025" },
    ],
    links: [{ type: "YouTube", url: "https://youtube.com/@sureshiyer_flute" }],
  },
  {
    id: "6", slug: "priya-balakrishnan", name: "Priya Balakrishnan", email: "priya@example.com",
    province: "Zuid-Holland", status: "active", joinedAt: "15 Nov 2024",
    contactNumber: "+31633445566", contactType: "whatsapp", availableForCollab: true,
    specialities: [{ name: "Vocal", color: "#7C3AED" }],
    bio: `<p>Priya Balakrishnan is a Carnatic vocalist based in Rotterdam, trained under the renowned Smt. Aruna Sairam. Her voice is characterised by its warmth, clarity, and remarkable range - spanning nearly three octaves with effortless ease.</p>
<p>Priya specialises in the bhakti (devotional) tradition of Carnatic music, with a particular focus on the compositions of Papanasam Sivan and Gopalakrishna Bharati. Her renditions of these compositions are deeply moving, combining technical precision with heartfelt devotion.</p>
<p>Since relocating to Rotterdam in 2020, Priya has become one of the most active performers in the Dutch Carnatic community. She performs regularly at the De Doelen concert hall and has been a featured artist at the Rotterdam World Music Festival for three consecutive years.</p>
<p>Priya is also an active music teacher, running a Carnatic vocal school in Rotterdam with over 30 students. She is passionate about making Carnatic music accessible to the next generation and regularly performs at schools and community centres across South Holland.</p>`,
    availabilityDates: [
      { from: "2025-05-10", to: "2025-05-25" },
      { from: "2025-07-15", to: "2025-08-10" },
    ],
    collabs: [
      { id: "c4", slug: "amsterdam-rasikas-evening",  name: "Amsterdam Rasikas Evening",  role: "Owner",  status: "active" },
      { id: "c2", slug: "thyagaraja-aradhana-2025",   name: "Thyagaraja Aradhana 2025",   role: "Member", status: "active" },
    ],
    reviews: [],
    links: [
      { type: "Instagram", url: "https://instagram.com/priyacarnaticvocal" },
      { type: "Facebook",  url: "https://facebook.com/priyabalakrishnanmusic" },
    ],
  },
  {
    id: "7", slug: "karthik-seshadri", name: "Karthik Seshadri", email: "karthik@example.com",
    province: "Noord-Brabant", status: "active", joinedAt: "01 Dec 2024",
    contactNumber: "+31644556677", contactType: "mobile", availableForCollab: true,
    specialities: [{ name: "Ghatam", color: "#92400E" }],
    bio: `<p>Karthik Seshadri is a ghatam artist based in Eindhoven, Noord-Brabant. He trained under the legendary Shri T.H. Vinayakram, the artist who brought the ghatam to international prominence through his collaborations with John McLaughlin and the Shakti ensemble.</p>
<p>The ghatam - a clay pot percussion instrument - is one of the most ancient instruments in the Carnatic tradition. In the hands of a master like Karthik, it becomes a vehicle for extraordinary rhythmic expression, capable of producing a wide range of tones and textures.</p>
<p>Karthik is known for his lightning-fast finger work, his ability to produce complex rhythmic patterns with apparent ease, and his remarkable musicality - qualities that make him equally effective as a soloist and as an ensemble player.</p>
<p>Based in Eindhoven since 2021, Karthik has been active in the Dutch music scene, performing at festivals and collaborating with both Carnatic and Western musicians. He recently performed at the STRP Festival in Eindhoven, where his ghatam playing captivated an audience of over 2,000 people.</p>`,
    availabilityDates: [
      { from: "2025-06-01", to: "2025-06-20" },
      { from: "2025-10-01", to: "2025-10-31" },
    ],
    collabs: [
      { id: "c6", slug: "percussion-ensemble-nl",  name: "Percussion Ensemble NL",  role: "Owner",  status: "active" },
      { id: "c8", slug: "navarathri-golu-concert", name: "Navarathri Golu Concert", role: "Member", status: "incomplete" },
    ],
    reviews: [
      { id: "rv-karthik-anand-percussion", reviewerSlug: "anand-subramanian", from: "Anand Subramanian", rating: 5, comment: "Karthik's ghatam playing is phenomenal. His rhythmic creativity and technical mastery are truly inspiring.", collab: "Percussion Ensemble NL", date: "10 Mar 2025" },
    ],
    links: [{ type: "YouTube", url: "https://youtube.com/@karthikghatam" }],
  },
  {
    id: "8", slug: "divya-ramachandran", name: "Divya Ramachandran", email: "divya@example.com",
    province: "Utrecht", status: "suspended", joinedAt: "10 Dec 2024",
    contactNumber: "+31655667788", contactType: "whatsapp", availableForCollab: false,
    specialities: [{ name: "Kanjira", color: "#BE185D" }],
    bio: `<p>Divya Ramachandran is a kanjira artist based in Utrecht. She trained under Shri Selvaganesh Vinayakram, a master of both the kanjira and the ghatam.</p>
<p>The kanjira - a small frame drum with a single jingle - is one of the most challenging instruments in the Carnatic tradition, requiring extraordinary control of both hands and a deep understanding of rhythm. Divya has mastered this instrument to a remarkable degree, producing a rich, resonant sound that belies the instrument's small size.</p>
<p>Note: This account is currently suspended pending review.</p>`,
    availabilityDates: [],
    collabs: [
      { id: "c6", slug: "percussion-ensemble-nl", name: "Percussion Ensemble NL", role: "Member", status: "active" },
    ],
    reviews: [],
    links: [],
  },
  {
    id: "9", slug: "srinivas-parthasarathy", name: "Srinivas Parthasarathy", email: "srinivas@example.com",
    province: "Zuid-Holland", status: "active", joinedAt: "05 Jan 2025",
    contactNumber: "+31666778899", contactType: "mobile", availableForCollab: true,
    specialities: [{ name: "Thavil", color: "#7E22CE" }],
    bio: `<p>Srinivas Parthasarathy is a thavil artist based in The Hague. He trained under Shri Valayapatti A.R. Subramaniam, one of the foremost thavil artists of his generation.</p>
<p>The thavil is a barrel-shaped percussion instrument traditionally associated with the nadaswaram - together they form the sacred ensemble of South Indian temple music. In Srinivas's hands, the thavil transcends its traditional context to become a powerful concert instrument capable of extraordinary rhythmic expression.</p>
<p>Srinivas is known for his powerful, resonant playing style, his mastery of complex rhythmic patterns, and his ability to create a sense of sacred energy in any performance space. He has performed at temples, concert halls, and festivals across Europe and India.</p>
<p>Since relocating to The Hague in 2022, Srinivas has been working to introduce the thavil to Dutch audiences, performing at world music festivals and collaborating with musicians from diverse traditions.</p>`,
    availabilityDates: [
      { from: "2025-04-20", to: "2025-05-10" },
      { from: "2025-08-15", to: "2025-09-15" },
    ],
    collabs: [
      { id: "c7", slug: "carnatic-youth-workshop", name: "Carnatic Youth Workshop", role: "Member", status: "active" },
    ],
    reviews: [],
    links: [],
  },
  {
    id: "10", slug: "kavitha-muralidharan", name: "Kavitha Muralidharan", email: "kavitha@example.com",
    province: "Noord-Holland", status: "active", joinedAt: "20 Jan 2025",
    contactNumber: "+31677889911", contactType: "whatsapp", availableForCollab: false,
    specialities: [{ name: "Nadaswaram", color: "#C2410C" }],
    bio: `<p>Kavitha Muralidharan is a nadaswaram artist based in Amsterdam - one of the very few female nadaswaram artists performing at the concert level. She trained under Shri Sheik Chinna Moulana, a legendary nadaswaram maestro.</p>
<p>The nadaswaram is one of the loudest non-brass acoustic instruments in the world, traditionally played at Hindu temples and weddings. Its piercing, powerful sound is considered auspicious and is believed to ward off evil spirits. In Kavitha's hands, this ancient instrument becomes a vehicle for profound musical expression.</p>
<p>Kavitha has broken significant barriers as a female nadaswaram artist in a tradition that has been almost exclusively male. Her performances combine technical mastery with a deep spiritual commitment, creating an experience that is both musically sophisticated and emotionally overwhelming.</p>
<p>Based in Amsterdam since 2023, Kavitha performs at temples, cultural events, and concert halls across The Netherlands. She is also working on a project to document the nadaswaram tradition and make it accessible to younger generations.</p>`,
    availabilityDates: [],
    collabs: [
      { id: "c8", slug: "navarathri-golu-concert", name: "Navarathri Golu Concert", role: "Owner", status: "incomplete" },
    ],
    reviews: [],
    links: [{ type: "YouTube", url: "https://youtube.com/@kavithanadaswaram" }],
  },
  {
    id: "11", slug: "vijay-anantharaman", name: "Vijay Anantharaman", email: "vijay@example.com",
    province: "Overijssel", status: "active", joinedAt: "01 Feb 2025",
    contactNumber: "+31688990011", contactType: "mobile", availableForCollab: true,
    specialities: [
      { name: "Violin",  color: "#B45309" },
      { name: "Morsing", color: "#065F46" },
    ],
    bio: `<p>Vijay Anantharaman is a multi-instrumentalist based in Enschede, Overijssel - one of the rare artists who has achieved mastery in both the violin and the morsing (jaw harp). He trained in violin under Shri Lalgudi G.J.R. Krishnan and in morsing under Shri Bangalore Amrit.</p>
<p>The combination of violin and morsing is unusual in the Carnatic tradition, and Vijay's mastery of both instruments gives him a unique perspective on Carnatic music. He is able to approach a composition from both a melodic and a rhythmic angle simultaneously, making him an extraordinarily versatile collaborator.</p>
<p>Vijay's violin playing is characterised by a singing tone, fluid gamaka, and a deep understanding of raga grammar. His morsing playing is equally impressive - he is able to produce a remarkable range of sounds from this simple instrument, creating complex rhythmic patterns that complement and enhance the percussion section.</p>
<p>Based in Enschede since 2024, Vijay is one of the newer members of the Dutch Carnatic community but has already made a significant impact with his performances and his willingness to collaborate across musical traditions.</p>`,
    availabilityDates: [
      { from: "2025-05-01", to: "2025-05-31" },
      { from: "2025-09-15", to: "2025-10-15" },
    ],
    collabs: [
      { id: "c2", slug: "thyagaraja-aradhana-2025", name: "Thyagaraja Aradhana 2025", role: "Member", status: "active" },
      { id: "c7", slug: "carnatic-youth-workshop",  name: "Carnatic Youth Workshop",  role: "Member", status: "active" },
    ],
    reviews: [],
    links: [{ type: "LinkedIn", url: "https://linkedin.com/in/vijayanantharaman" }],
  },
  {
    id: "12", slug: "nithya-subramanian", name: "Nithya Subramanian", email: "nithya@example.com",
    province: "Gelderland", status: "active", joinedAt: "15 Feb 2025",
    contactNumber: "+31699001122", contactType: "whatsapp", availableForCollab: true,
    specialities: [{ name: "Vocal", color: "#7C3AED" }],
    bio: `<p>Nithya Subramanian is a Carnatic vocalist based in Arnhem, Gelderland. She trained under Shri T.M. Krishna, one of the most innovative and intellectually rigorous Carnatic musicians of his generation, known for his commitment to making Carnatic music accessible to all.</p>
<p>Nithya's approach to Carnatic music reflects her guru's philosophy - she is deeply committed to the classical tradition while also being open to new contexts and collaborations. Her voice is characterised by its clarity, precision, and a quality of focused intensity that draws listeners into the music.</p>
<p>She is particularly known for her renditions of compositions by women composers in the Carnatic tradition - a repertoire that has been historically underrepresented in concert settings. Her project <em>Stree Nada</em> (Women's Sound) has brought renewed attention to the contributions of female composers to the Carnatic canon.</p>
<p>Having relocated to Arnhem in early 2025, Nithya is one of the newest members of the Dutch Carnatic community. She is already active in organising concerts and workshops, and her energy and enthusiasm are a welcome addition to the community.</p>`,
    availabilityDates: [
      { from: "2025-04-10", to: "2025-04-30" },
      { from: "2025-06-01", to: "2025-06-15" },
      { from: "2025-10-01", to: "2025-10-20" },
    ],
    collabs: [
      { id: "c7", slug: "carnatic-youth-workshop",  name: "Carnatic Youth Workshop",  role: "Owner",  status: "active" },
      { id: "c2", slug: "thyagaraja-aradhana-2025", name: "Thyagaraja Aradhana 2025", role: "Member", status: "active" },
    ],
    reviews: [],
    links: [
      { type: "Instagram", url: "https://instagram.com/nithyacarnaticvocal" },
      { type: "YouTube",   url: "https://youtube.com/@nithyasubramanian" },
    ],
  },
];

export const DUMMY_ARTISTS_MAP: Record<string, DummyArtist> =
  Object.fromEntries(DUMMY_ARTISTS.map(a => [a.id, a]));

/** Look up by slug (used in public URLs) */
export const DUMMY_ARTISTS_BY_SLUG: Record<string, DummyArtist> =
  Object.fromEntries(DUMMY_ARTISTS.map(a => [a.slug, a]));
