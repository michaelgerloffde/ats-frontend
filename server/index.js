import express from 'express';

const app = express();

app.get('/api/hallo', (req, res) => {
  res.json({ nachricht: 'Hallo vom Server' });
});

app.get('/api/jobs', (req, res) => {
  const jobs = [
    {
      id: 1,
      title: 'Disponent:in Straßenverkehr (m/w/d)',
      department: 'Disposition',
      location: 'Hamburg',
      employment_type: 'Vollzeit',
      status: 'published',
      created_at: '2026-10-20T08:00:00.000Z',
    },
    {
      id: 2,
      title: 'Lagerlogistiker:in (m/w/d)',
      department: 'Lager',
      location: 'Bremen',
      employment_type: 'Teilzeit',
      status: 'published',
      created_at: '2026-10-25T08:00:00.000Z',
    },
  ];

  res.json({
    jobs: jobs,
    pagination: { page: 1, pages: 1, total: jobs.length },
    options: {
      departments: ['Disposition', 'Lager'],
      locations: ['Bremen', 'Hamburg'],
    },
  });
});
















app.listen(3000, () => {
  console.log('Server läuft auf http://localhost:3000');
});