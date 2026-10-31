import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from './config'

export const REAL_SAMPLE_COURSES = [
  {
    title: 'Advanced Mathematics: Differential & Integral Calculus',
    headline: 'Master limits, derivatives, chain rule, and integral calculus with WAEC, JAMB & university past questions.',
    subject: 'Mathematics',
    level: 'Intermediate & University Prep',
    rating: 4.9,
    reviewsCount: 384,
    studentsCount: '1,420',
    duration: '6 hours · 14 lessons',
    lessonsCount: 14,
    price: 3500,
    originalPrice: 7000,
    thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80',
    tutor: {
      name: 'Engr. Tunde Adeleke',
      title: 'Senior Mathematics Lecturer & FUTA Alum',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      rating: 4.95,
      students: '620+',
    },
    learningPoints: [
      'Master the conceptual basis of limits, continuity, and infinite series',
      'Differentiate complex polynomial, trigonometric, and logarithmic functions',
      'Apply integration to area under curves, volumes of revolution, and physics kinematics',
      'Solve previous WAEC, NECO, and Post-UTME questions step-by-step',
    ],
    curriculum: [
      { id: 'c1-1', title: '1. Limits and Continuity Intuition', duration: '24m', isFree: true, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
      { id: 'c1-2', title: '2. First Principles & Derivative Rules', duration: '32m', isFree: false, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
      { id: 'c1-3', title: '3. Product, Quotient, and Chain Rules', duration: '40m', isFree: false, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
      { id: 'c1-4', title: '4. Indefinite & Definite Integrals', duration: '45m', isFree: false, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
      { id: 'c1-5', title: '5. WAEC & UTME Past Questions Marathon', duration: '50m', isFree: false, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' },
    ],
    status: 'published',
  },
  {
    title: 'Cellular Biology & Genetics Foundations',
    headline: 'In-depth breakdown of cellular ultrastructure, bioenergetics, Mendelian genetics, and DNA replication.',
    subject: 'Science',
    level: 'Secondary & Pre-Med',
    rating: 4.85,
    reviewsCount: 260,
    studentsCount: '980',
    duration: '5 hours · 12 lessons',
    lessonsCount: 12,
    price: 3000,
    originalPrice: 6000,
    thumbnailUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
    tutor: {
      name: 'Dr. Ngozi Eze',
      title: 'Ph.D. Cellular Biology & WAEC Examiner, UI',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      rating: 4.9,
      students: '450+',
    },
    learningPoints: [
      'Understand organelle functions in eukaryotic and prokaryotic cells',
      'Explain passive diffusion, osmosis, active transport, and enzyme kinetics',
      'Calculate inheritance ratios using Punnett squares and pedigree charts',
      'Ace high school finals and medical university entrance exams',
    ],
    curriculum: [
      { id: 'c2-1', title: '1. Cell Theory & Organelle Specialization', duration: '20m', isFree: true, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
      { id: 'c2-2', title: '2. Membrane Transport & Osmotic Pressure', duration: '35m', isFree: false, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
      { id: 'c2-3', title: '3. Mitosis vs Meiosis Detailed Comparison', duration: '40m', isFree: false, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
      { id: 'c2-4', title: '4. Mendelian Laws & Dihybrid Crosses', duration: '45m', isFree: false, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
    ],
    status: 'published',
  },
  {
    title: 'Python for Beginners & Data Science Mastery',
    headline: 'From absolute zero programming to building real automation tools, analysis scripts, and algorithmic problem solving.',
    subject: 'Computer Science',
    level: 'Beginner to Intermediate',
    rating: 4.92,
    reviewsCount: 415,
    studentsCount: '2,150',
    duration: '8 hours · 18 lessons',
    lessonsCount: 18,
    price: 4500,
    originalPrice: 9000,
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    tutor: {
      name: 'Chukwuma Obi',
      title: 'Senior Software Engineer & Tech Educator',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
      rating: 4.92,
      students: '890+',
    },
    learningPoints: [
      'Write clean, readable Python code adhering to PEP 8 standards',
      'Work with core data structures: lists, dictionaries, tuples, and sets',
      'Handle file I/O, API responses, and error exceptions gracefully',
      'Analyze datasets using NumPy and Pandas with visual matplotlib plots',
    ],
    curriculum: [
      { id: 'c3-1', title: '1. Installing Python & First Script', duration: '18m', isFree: true, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
      { id: 'c3-2', title: '2. Variables, Conditionals, and Logic', duration: '28m', isFree: false, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
      { id: 'c3-3', title: '3. Loops, Functions & Modular Code', duration: '36m', isFree: false, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
      { id: 'c3-4', title: '4. Mini Project: Automated Student Gradebook', duration: '42m', isFree: false, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
    ],
    status: 'published',
  },
  {
    title: 'Financial Accounting & Microeconomic Principles',
    headline: 'Complete guide to balance sheets, profit & loss statements, ledger balancing, and supply-demand elasticities.',
    subject: 'Business',
    level: 'High School & Undergrad',
    rating: 4.88,
    reviewsCount: 195,
    studentsCount: '810',
    duration: '4.5 hours · 10 lessons',
    lessonsCount: 10,
    price: 3000,
    originalPrice: 5500,
    thumbnailUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    tutor: {
      name: 'Amina Yusuf, ACA',
      title: 'Chartered Accountant & Business Tutor',
      avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80',
      rating: 4.85,
      students: '310+',
    },
    learningPoints: [
      'Master the double-entry bookkeeping system with real business ledgers',
      'Prepare accurate trial balances, income statements, and balance sheets',
      'Calculate price elasticity of demand and market equilibrium',
      'Interpret company annual reports and key financial ratios',
    ],
    curriculum: [
      { id: 'c4-1', title: '1. Introduction to Double-Entry Accounting', duration: '22m', isFree: true, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
      { id: 'c4-2', title: '2. Journals, General Ledgers, and Cash Books', duration: '35m', isFree: false, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
      { id: 'c4-3', title: '3. Trial Balance & Error Correction', duration: '38m', isFree: false, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
    ],
    status: 'published',
  },
  {
    title: 'English Language Mastery: Essay Writing & IELTS Band 8+',
    headline: 'Refine your written fluency, master formal argumentative structure, summary techniques, and phonetics.',
    subject: 'Languages',
    level: 'All Levels',
    rating: 4.94,
    reviewsCount: 310,
    studentsCount: '1,280',
    duration: '5 hours · 12 lessons',
    lessonsCount: 12,
    price: 3200,
    originalPrice: 6500,
    thumbnailUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80',
    tutor: {
      name: 'Mrs. Funmi Bello',
      title: 'Certified IELTS Instructor & Literary Editor',
      avatar: 'https://images.unsplash.com/photo-1580894732488-8289bf6554c0?auto=format&fit=crop&w=400&q=80',
      rating: 4.88,
      students: '420+',
    },
    learningPoints: [
      'Write structured essays that score band 8+ on coherence and cohesion',
      'Master complex sentences, idiomatic expressions, and punctuation rules',
      'Tackle comprehension passages and precise summary questions under timed conditions',
      'Develop clear oral presentation skills and interview speaking confidence',
    ],
    curriculum: [
      { id: 'c5-1', title: '1. Essay Anatomy: Introductions & Thesis Statements', duration: '25m', isFree: true, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
      { id: 'c5-2', title: '2. Argumentative Body Paragraphs with Strong Evidence', duration: '30m', isFree: false, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
      { id: 'c5-3', title: '3. Summary Writing Mastery for WAEC & NECO', duration: '35m', isFree: false, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
    ],
    status: 'published',
  },
]

export const REAL_SAMPLE_TUTORS = [
  {
    uid: 'tutor-ngozi-eze',
    displayName: 'Dr. Ngozi Eze',
    email: 'ngozi.eze@klaso.edu.ng',
    role: 'tutor',
    approved: true,
    subject: 'Science',
    specialty: 'Biology, Genetics & Pre-Med Preparation',
    rating: 4.9,
    reviewsCount: 142,
    hourlyRate: 3500,
    experience: '8 yrs exp • 450+ students',
    photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    bio: 'Senior lecturer at the University of Ibadan with 8 years of teaching excellence. Specializes in cellular biology, molecular biochemistry, and WAEC/JAMB exam strategy.',
    education: 'Ph.D. Cellular Biology, University of Ibadan',
    slots: ['Today, 4:00 PM', 'Tomorrow, 10:00 AM', 'Tomorrow, 2:00 PM'],
    tags: ['Biology', 'Genetics', 'WAEC Prep', 'Pre-Med'],
  },
  {
    uid: 'tutor-tunde-adeleke',
    displayName: 'Engr. Tunde Adeleke',
    email: 'tunde.adeleke@klaso.edu.ng',
    role: 'tutor',
    approved: true,
    subject: 'Mathematics',
    specialty: 'Calculus, Further Mathematics & Engineering Mechanics',
    rating: 4.95,
    reviewsCount: 198,
    hourlyRate: 4000,
    experience: '6 yrs exp • 620+ students',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    bio: 'Mechanical engineering graduate from FUTA. Passioned about demystifying calculus and algebra so that students build genuine problem-solving confidence.',
    education: 'B.Eng. Mechanical Engineering, FUTA',
    slots: ['Today, 6:00 PM', 'Saturday, 11:00 AM', 'Saturday, 3:00 PM'],
    tags: ['Calculus', 'Algebra', 'Further Math', 'JAMB'],
  },
  {
    uid: 'tutor-funmi-bello',
    displayName: 'Mrs. Funmi Bello',
    email: 'funmi.bello@klaso.edu.ng',
    role: 'tutor',
    approved: true,
    subject: 'Languages',
    specialty: 'English Grammar, IELTS & Essay Craft',
    rating: 4.88,
    reviewsCount: 110,
    hourlyRate: 3000,
    experience: '10 yrs exp • 380+ students',
    photoURL: 'https://images.unsplash.com/photo-1580894732488-8289bf6554c0?auto=format&fit=crop&w=400&q=80',
    bio: 'Certified IELTS instructor and former high school English department head. Passionate about helping students write with conviction, clarity, and grammatical precision.',
    education: 'M.A. English Literature, UNILAG',
    slots: ['Tomorrow, 1:00 PM', 'Friday, 5:00 PM', 'Saturday, 9:00 AM'],
    tags: ['IELTS', 'Essay Craft', 'Grammar', 'Phonetics'],
  },
  {
    uid: 'tutor-chukwuma-obi',
    displayName: 'Chukwuma Obi',
    email: 'chuks.obi@klaso.edu.ng',
    role: 'tutor',
    approved: true,
    subject: 'Computer Science',
    specialty: 'Python, Web Development & Algorithms',
    rating: 4.92,
    reviewsCount: 86,
    hourlyRate: 4500,
    experience: '5 yrs exp • 290+ students',
    photoURL: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
    bio: 'Lead frontend & Python developer who mentors university students and career switchers into high-performing tech roles through hands-on project building.',
    education: 'B.Sc. Computer Science, Covenant University',
    slots: ['Today, 7:00 PM', 'Tomorrow, 6:00 PM', 'Sunday, 2:00 PM'],
    tags: ['Python', 'JavaScript', 'Algorithms', 'Full-Stack'],
  },
  {
    uid: 'tutor-amina-yusuf',
    displayName: 'Amina Yusuf, ACA',
    email: 'amina.yusuf@klaso.edu.ng',
    role: 'tutor',
    approved: true,
    subject: 'Business',
    specialty: 'Financial Accounting, Microeconomics & Commerce',
    rating: 4.85,
    reviewsCount: 74,
    hourlyRate: 3200,
    experience: '7 yrs exp • 210+ students',
    photoURL: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80',
    bio: 'Associate Chartered Accountant helping students understand balance sheets, double-entry bookkeeping, and microeconomics with practical Nigerian market examples.',
    education: 'B.Sc. Accounting, ABU Zaria • ACA Certified',
    slots: ['Tomorrow, 3:00 PM', 'Friday, 11:00 AM', 'Saturday, 4:00 PM'],
    tags: ['Accounting', 'Economics', 'Commerce', 'Financial Math'],
  },
]

/**
 * Seeds courses and verified tutors into Firestore
 */
export async function seedFirestoreDatabase(force = false) {
  try {
    const coursesSnapshot = await getDocs(collection(db, 'courses'))
    
    // If not forcing and data already exists, do not duplicate
    if (!force && !coursesSnapshot.empty) {
      return { success: true, count: coursesSnapshot.size, alreadySeeded: true }
    }

    let coursesCount = 0
    for (const course of REAL_SAMPLE_COURSES) {
      await addDoc(collection(db, 'courses'), {
        ...course,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      coursesCount++
    }

    let tutorsCount = 0
    for (const tutor of REAL_SAMPLE_TUTORS) {
      await setDoc(doc(db, 'users', tutor.uid), {
        ...tutor,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true })
      tutorsCount++
    }

    return {
      success: true,
      coursesCount,
      tutorsCount,
      alreadySeeded: false,
    }
  } catch (error) {
    console.error('Error seeding Firestore:', error)
    throw error
  }
}

/**
 * Clears seeded courses from Firestore (for testing empty states)
 */
export async function clearSeededFirestoreCourses() {
  try {
    const snapshot = await getDocs(collection(db, 'courses'))
    const deletes = snapshot.docs.map((docSnap) => deleteDoc(doc(db, 'courses', docSnap.id)))
    await Promise.all(deletes)
    return { success: true, count: deletes.length }
  } catch (error) {
    console.error('Error clearing courses:', error)
    throw error
  }
}
