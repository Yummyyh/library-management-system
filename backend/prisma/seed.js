const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // Hash passwords
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const librarianPasswordHash = await bcrypt.hash('lib123', 10);
  const student1PasswordHash = await bcrypt.hash('stud123', 10);
  const student2PasswordHash = await bcrypt.hash('stud456', 10);

  // Create users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@library.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@library.com',
      passwordHash: adminPasswordHash,
      studentId: 'ADMIN001',
      role: 'ADMIN',
    },
  });

  const librarian = await prisma.user.upsert({
    where: { email: 'librarian@library.com' },
    update: {},
    create: {
      name: 'Librarian User',
      email: 'librarian@library.com',
      passwordHash: librarianPasswordHash,
      studentId: 'LIB001',
      role: 'LIBRARIAN',
    },
  });

  const student1 = await prisma.user.upsert({
    where: { email: 'student1@university.edu' },
    update: {},
    create: {
      name: 'Alice Zhang',
      email: 'student1@university.edu',
      passwordHash: student1PasswordHash,
      studentId: 'STU2023001',
      role: 'STUDENT',
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@university.edu' },
    update: {},
    create: {
      name: 'Bob Li',
      email: 'student2@university.edu',
      passwordHash: student2PasswordHash,
      studentId: 'STU2023002',
      role: 'STUDENT',
    },
  });

  // Genres
  const genres = [
    'Technology',
    'Fiction',
    'Science',
    'History',
    'Management'
  ];

  // Book data
  const bookSeeds = [
    // Technology (4)
    {
      title: "Clean Code: A Handbook of Agile Software Craftsmanship",
      author: "Robert C. Martin",
      isbn: "9780132350884",
      genre: "Technology",
      description: "Classic guide to writing clean, maintainable code.",
      language: "English",
      shelfLocation: "Tech-A1",
      stock: 1,
      isDeleted: false,
    },
    {
      title: "The Pragmatic Programmer",
      author: "Andrew Hunt & David Thomas",
      isbn: "9780201616224",
      genre: "Technology",
      description: "Tips for software developers to improve daily work.",
      language: "English",
      shelfLocation: "Tech-A2",
      stock: 1,
      isDeleted: false,
    },
    {
      title: "Introduction to Algorithms",
      author: "Thomas H. Cormen",
      isbn: "9780262033848",
      genre: "Technology",
      description: "Comprehensive algorithms textbook used worldwide.",
      language: "English",
      shelfLocation: "Tech-A3",
      stock: 0,   
      isDeleted: false,
    },
    {
      title: "Artificial Intelligence: A Modern Approach",
      author: "Stuart Russell & Peter Norvig",
      isbn: "9780136042594",
      genre: "Technology",
      description: "Definitive AI introduction for students.",
      language: "English",
      shelfLocation: "Tech-A4",
      stock: 1,           
      isDeleted: false,
    },
    // Fiction (4)
    {
      title: "To Kill a Mockingbird",
      author: "Harper Lee",
      isbn: "9780061120084",
      genre: "Fiction",
      description: "Pulitzer Prize-winning novel of racial injustice.",
      language: "English",
      shelfLocation: "Fic-B1",
      stock: 1,
         isDeleted: false,
    },
    {
      title: "1984",
      author: "George Orwell",
      isbn: "9780451524935",
      genre: "Fiction",
      description: "Dystopian novel about totalitarianism.",
      language: "English",
      shelfLocation: "Fic-B2",
      stock: 0,
          isDeleted: false,
    },
    {
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      isbn: "9780743273565",
      genre: "Fiction",
      description: "Classic critique of the American Dream.",
      language: "English",
      shelfLocation: "Fic-B3",
      stock: 1,
          isDeleted: false,
    },
    {
      title: "Life of Pi",
      author: "Yann Martel",
      isbn: "9780156027328",
      genre: "Fiction",
      description: "A young boy's struggle for survival at sea.",
      language: "English",
      shelfLocation: "Fic-B4",
      stock: 1,
          isDeleted: false,
    },
    // Science (4)
    {
      title: "A Brief History of Time",
      author: "Stephen Hawking",
      isbn: "9780553380163",
      genre: "Science",
      description: "Cosmology for the masses, by a renowned physicist.",
      language: "English",
      shelfLocation: "Sci-C1",
      stock: 1,     isDeleted: false,
    },
    {
      title: "The Selfish Gene",
      author: "Richard Dawkins",
      isbn: "9780199291151",
      genre: "Science",
      description: "Groundbreaking work on evolution and genetics.",
      language: "English",
      shelfLocation: "Sci-C2",
      stock: 0,    isDeleted: false,
    },
    {
      title: "The Gene: An Intimate History",
      author: "Siddhartha Mukherjee",
      isbn: "9781476733500",
      genre: "Science",
      description: "Story of the gene and its impact.",
      language: "English",
      shelfLocation: "Sci-C3",
      stock: 1,    isDeleted: false,
    },
    {
      title: "Silent Spring",
      author: "Rachel Carson",
      isbn: "9780618249060",
      genre: "Science",
      description: "Sparked the environmental movement.",
      language: "English",
      shelfLocation: "Sci-C4",
      stock: 1,    isDeleted: false,
    },
    // History (4)
    {
      title: "Guns, Germs, and Steel",
      author: "Jared Diamond",
      isbn: "9780393317558",
      genre: "History",
      description: "The fates of human societies analyzed.",
      language: "English",
      shelfLocation: "His-D1",
      stock: 1,    isDeleted: false,
    },
    {
      title: "Sapiens: A Brief History of Humankind",
      author: "Yuval Noah Harari",
      isbn: "9780062316097",
      genre: "History",
      description: "The ascent of Homo sapiens.",
      language: "English",
      shelfLocation: "His-D2",
      stock: 0,    isDeleted: false,
    },
    {
      title: "The Silk Roads: A New History of the World",
      author: "Peter Frankopan",
      isbn: "9781101912379",
      genre: "History",
      description: "A major reassessment of world history.",
      language: "English",
      shelfLocation: "His-D3",
      stock: 1,    isDeleted: false,
    },
    {
      title: "Postwar: A History of Europe Since 1945",
      author: "Tony Judt",
      isbn: "9780143037750",
      genre: "History",
      description: "Comprehensive history of contemporary Europe.",
      language: "English",
      shelfLocation: "His-D4",
      stock: 1,    isDeleted: false,
    },
    // Management (4)
    {
      title: "The Lean Startup",
      author: "Eric Ries",
      isbn: "9780307887894",
      genre: "Management",
      description: "How today's entrepreneurs use continuous innovation.",
      language: "English",
      shelfLocation: "Man-E1",
      stock: 1,    isDeleted: false,
    },
    {
      title: "Good to Great",
      author: "Jim Collins",
      isbn: "9780066620992",
      genre: "Management",
      description: "Why some companies make the leap.",
      language: "English",
      shelfLocation: "Man-E2",
      stock: 1,    isDeleted: false,
    },
    {
      title: "The Five Dysfunctions of a Team",
      author: "Patrick Lencioni",
      isbn: "9780787960759",
      genre: "Management",
      description: "A leadership fable.",
      language: "English",
      shelfLocation: "Man-E3",
      stock: 0,    isDeleted: false,
    },
    {
      title: "Drive: The Surprising Truth About What Motivates Us",
      author: "Daniel H. Pink",
      isbn: "9781594484803",
      genre: "Management",
      description: "A new look at what motivates people.",
      language: "English",
      shelfLocation: "Man-E4",
              stock: 1,    isDeleted: false,
    }
  ];

  // Insert books
  for (const book of bookSeeds) {
    await prisma.book.upsert({
      where: { isbn: book.isbn },
      update: {},
      create: {
        ...book
      },
    });
  }

  // Insert Config
  await prisma.config.upsert({
    where: { key: 'FINE_RATE_PER_DAY' },
    update: { value: '0.50' },
    create: { key: 'FINE_RATE_PER_DAY', value: '0.50' }
  });

  console.log('Seeding done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });