-- Add category column to topics
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';

-- Clear existing topics (cascades to arguments via FK)
TRUNCATE public.topics CASCADE;

-- Seed all topics with categories
INSERT INTO public.topics (name, category, description) VALUES
  -- Technology & AI
  ('AI will create more jobs than it destroys',             'Technology & AI',      ''),
  ('Social media does more harm than good',                 'Technology & AI',      ''),
  ('Governments should heavily regulate AI',               'Technology & AI',      ''),
  ('Privacy matters more than national security online',   'Technology & AI',      ''),
  ('Humans should merge with AI (cyborgs)',                 'Technology & AI',      ''),

  -- Government
  ('Abolish the Electoral College',                        'Government',           ''),
  ('Voting should be mandatory',                           'Government',           ''),
  ('Congress should have term limits',                     'Government',           ''),
  ('Adopt ranked-choice voting',                           'Government',           ''),
  ('Ban corporate political donations',                    'Government',           ''),

  -- Environment & Climate
  ('Climate change is humanity''s biggest threat',         'Environment & Climate',''),
  ('Individual actions can fix climate change',            'Environment & Climate',''),
  ('Nuclear energy is the best green solution',            'Environment & Climate',''),
  ('Tax or restrict meat consumption',                     'Environment & Climate',''),
  ('Poor countries deserve climate exemptions',            'Environment & Climate',''),

  -- Education
  ('College should be free for everyone',                  'Education',            ''),
  ('Abolish standardized testing',                         'Education',            ''),
  ('Teach life skills over advanced math',                 'Education',            ''),
  ('Strictly regulate homeschooling',                      'Education',            ''),
  ('Students should choose their own curriculum after 14', 'Education',            ''),
  ('There should be no homework',                          'Education',            ''),

  -- Health & Lifestyle
  ('Healthcare should be universal',                       'Health & Lifestyle',   ''),
  ('Legalize all recreational drugs',                      'Health & Lifestyle',   ''),
  ('Obesity is a personal responsibility issue',           'Health & Lifestyle',   ''),
  ('Allow genetic editing of embryos',                     'Health & Lifestyle',   ''),
  ('Make vaccines mandatory for school',                   'Health & Lifestyle',   ''),
  ('Make peptides legal',                                  'Health & Lifestyle',   ''),

  -- Economy & Work
  ('Raise the minimum wage',                               'Economy & Work',       ''),
  ('Implement Universal Basic Income',                     'Economy & Work',       ''),
  ('Remote work is better than office work',               'Economy & Work',       ''),
  ('Billionaires should not exist',                        'Economy & Work',       ''),
  ('Capitalism is the best system',                        'Economy & Work',       ''),

  -- Social Issues
  ('Ban affirmative action',                               'Social Issues',        ''),
  ('Cancel culture has gone too far',                      'Social Issues',        ''),
  ('Men and women are equal in all abilities',             'Social Issues',        ''),
  ('Gender is a social construct',                         'Social Issues',        ''),
  ('Make hate speech illegal',                             'Social Issues',        ''),

  -- Ethics & Morality
  ('The death penalty should be abolished',                'Ethics & Morality',    ''),
  ('Animals should have the same rights as humans',        'Ethics & Morality',    ''),
  ('Euthanasia should be allowed for anyone',              'Ethics & Morality',    ''),
  ('Patriotism does more good than harm',                  'Ethics & Morality',    ''),
  ('Abrahamic religions do more harm than good',           'Ethics & Morality',    ''),

  -- Philosophy
  ('The Ship of Theseus is still the same ship',           'Philosophy',           ''),
  ('Mathematics is discovered, not invented',              'Philosophy',           ''),
  ('Free will is an illusion',                             'Philosophy',           ''),
  ('Trolley Problem: pull the lever to kill 1 instead of 5','Philosophy',          ''),
  ('We are living in a simulation',                        'Philosophy',           ''),
  ('Experience Machine is worth plugging into',            'Philosophy',           ''),
  ('Teletransportation preserves your consciousness',      'Philosophy',           ''),
  ('Chinese Room proves computers cannot understand',      'Philosophy',           ''),
  ('Consciousness cannot be explained by physics alone',   'Philosophy',           ''),
  ('Morality is subjective',                               'Philosophy',           ''),
  ('Aliens exist',                                         'Philosophy',           ''),

  -- Society & Future
  ('Space colonization should be top priority',            'Society & Future',     ''),
  ('Human population growth is a major problem',           'Society & Future',     ''),
  ('Traditional marriage should be promoted',              'Society & Future',     ''),
  ('Treat social media as public utilities',               'Society & Future',     ''),
  ('The world would be better without religion',           'Society & Future',     '');
