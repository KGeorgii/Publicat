import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import styles from '../styles/Home.module.css';
import Image from 'next/image';
import "../styles/global.css";
import logo from '../asset/logo.png';
import Head from 'next/head';
import Papa from 'papaparse';
// Import chart.js for visualizations
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement);

const CSV_URL = '/data/data_2.csv';

// Define the type for journal entries
interface JournalEntry {
  journal_id?: string;
  journal_year?: string;
  article_name?: string;
  author?: string;
  translator?: string;
  language_name?: string;
  country?: string;
  country_latin?: string;
  [key: string]: string | undefined; // For any other fields in the CSV
}

// Define the type for chat messages
interface Message {
  role: 'user' | 'assistant';
  content: string;
  visualization?: {
    type: 'pie' | 'bar' | 'line';
    data: any;
    options: any;
  };
}

export default function AiChat() {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'Welcome to AI Assistant! Ask me questions about the journal collection, such as "What was the most popular language of translation in the 1960s?" or "Show me all authors from Australia."'
    }
  ]);
  const [thinking, setThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch the data when the component mounts
  useEffect(() => {
    getData();
  }, []);

  // Automatically scroll to the bottom of the chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getData = async () => {
    try {
      const response = await fetch(CSV_URL);
      if (!response.ok) throw new Error('Failed to fetch CSV from GitHub');

      const csvText = await response.text();
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          // Explicitly cast the parsed data to JournalEntry[]
          setJournals(result.data as JournalEntry[]);
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('Error loading CSV:', err);
      setLoading(false);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error loading the journal data. Please try again later.' 
      }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setThinking(true);
    
    // Process the query with the data
    try {
      const result = await processQuery(query, journals);
      setMessages(prev => [...prev, result]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your question. Please try again.' 
      }]);
    } finally {
      setThinking(false);
      setQuery('');
    }
  };

  const processQuery = async (query: string, data: JournalEntry[]): Promise<Message> => {
  const lowerQuery = query.toLowerCase();
  
  // Expanded query handling with more flexible matching
  const matchQueries = [
    {
      patterns: ['popular language', 'most common language'],
      handler: () => analyzePopularLanguages(data, lowerQuery)
    },
    {
      patterns: ['author from australia', 'australian authors', 'authors in australia'],
      handler: () => listAuthorsFromCountry(data, 'Australia')
    },
    {
      patterns: ['journals in', 'publications in', 'articles published in'],
      handler: () => {
        const yearMatch = lowerQuery.match(/\b(1[89]\d0s?|20\d0s?|\d{4})\b/);
        return yearMatch ? countJournalsByPeriod(data, yearMatch[0]) : 
          { role: 'assistant' as const, content: "Please specify a specific decade or year." };
      }
    },
    {
      patterns: ['translator', 'translators', 'translation work'],
      handler: () => analyzeTranslators(data, lowerQuery)
    },
    {
      patterns: ['most prolific author', 'author with most publications', 'top author'],
      handler: () => findMostProlificAuthor(data)
    },
    {
      patterns: ['countries', 'countries represented', 'author nationalities'],
      handler: () => analyzeCountries(data)
    },
    {
      patterns: ['article about', 'articles containing', 'publications on'],
      handler: () => searchArticles(data, lowerQuery)
    },
    {
      patterns: ['most active decade', 'decade with most publications', 'busiest decade'],
      handler: () => findMostActiveDecade(data)
    }
  ];

  // Find the first matching query pattern
  for (const queryPattern of matchQueries) {
    if (queryPattern.patterns.some(pattern => lowerQuery.includes(pattern))) {
      return await queryPattern.handler();
    }
  }

  return { 
    role: 'assistant' as const,
    content: "I'm not sure how to answer that specific question about the data." 
  };
};

  const analyzePopularLanguages = (data: JournalEntry[], query: string): Message => {
    // Extended decade filtering with more comprehensive coverage
    const decadeMapping: Record<string, [number, number]> = {
      '1920s': [1920, 1930],
      '1930s': [1930, 1940],
      '1940s': [1940, 1950],
      '1950s': [1950, 1960],
      '1960s': [1960, 1970],
      '1970s': [1970, 1980],
      '1980s': [1980, 1990],
      '1990s': [1990, 2000],
      '2000s': [2000, 2010]
    };

    // Find matching decade
    const matchedDecade = Object.keys(decadeMapping).find(decade => 
      query.includes(decade) || query.includes(decade.slice(0, -1))
    );

    // Filter data by decade or use entire dataset
    let filteredData = data;
    if (matchedDecade) {
      const [startYear, endYear] = decadeMapping[matchedDecade];
      filteredData = data.filter(item => {
        const year = parseInt(item.journal_year || '0');
        return year >= startYear && year < endYear;
      });
    }

    // Count language occurrences
    const languageCounts: Record<string, number> = {};
    filteredData.forEach(item => {
      if (item.language_name) {
        languageCounts[item.language_name] = (languageCounts[item.language_name] || 0) + 1;
      }
    });

    // Sort languages by popularity
    const sortedLanguages = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);  // Top 5 languages

    // Generate response
    if (sortedLanguages.length === 0) {
      return {
        role: 'assistant',
        content: "No language data found for the specified period."
      };
    }

    const periodText = matchedDecade ? ` in the ${matchedDecade}` : '';
    const languageList = sortedLanguages
      .map(([language, count]) => `${language} (${count} publications)`)
      .join(', ');

    // Create visualization data
    const labels = sortedLanguages.map(([language]) => language);
    const values = sortedLanguages.map(([_, count]) => count);
    
    // Create a color palette
    const backgroundColors = [
      'rgba(255, 99, 132, 0.7)',
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)'
    ];

    return {
      role: 'assistant',
      content: `Most popular languages${periodText}: ${languageList}`,
      visualization: {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: backgroundColors,
            borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: 'white'
              }
            },
            title: {
              display: true,
              text: `Most Popular Languages${periodText}`,
              color: 'white',
              font: {
                size: 16
              }
            }
          }
        }
      }
    };
  };

  const listAuthorsFromCountry = (data: JournalEntry[], country: string): Message => {
    const authors = new Set<string>();
    data.forEach(item => {
      if ((item.country === country || item.country_latin === country) && item.author) {
        authors.add(item.author);
      }
    });
    
    const authorList = Array.from(authors);
    
    if (authorList.length === 0) {
      return {
        role: 'assistant',
        content: `I couldn't find any authors from ${country} in the collection.`
      };
    }
    
    return {
      role: 'assistant',
      content: `Authors from ${country} in the collection:\n\n` +
             authorList.join('\n')
    };
  };

  const countJournalsByPeriod = (data: JournalEntry[], period: string): Message => {
    // Check if it's a decade or a specific year
    let filteredData;
    let periodText;
    
    if (period.endsWith('s')) {
      // It's a decade like "1960s"
      const decadeStart = parseInt(period.substring(0, 4));
      filteredData = data.filter(item => {
        const year = parseInt(item.journal_year || '0');
        return year >= decadeStart && year < decadeStart + 10;
      });
      periodText = period;
      
      // Additional data for visualization - count by year within decade
      const yearCounts: Record<string, number> = {};
      for (let year = decadeStart; year < decadeStart + 10; year++) {
        yearCounts[year.toString()] = 0;
      }
      
      filteredData.forEach(item => {
        if (item.journal_year) {
          yearCounts[item.journal_year] = (yearCounts[item.journal_year] || 0) + 1;
        }
      });
      
      // Create bar chart data
      const labels = Object.keys(yearCounts).sort();
      const values = labels.map(year => yearCounts[year]);
      
      return {
        role: 'assistant',
        content: `There were ${filteredData.length} articles published in ${periodText}.`,
        visualization: {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Publications',
              data: values,
              backgroundColor: 'rgba(75, 192, 192, 0.7)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  color: 'white'
                },
                grid: {
                  color: 'rgba(255, 255, 255, 0.1)'
                }
              },
              x: {
                ticks: {
                  color: 'white'
                },
                grid: {
                  color: 'rgba(255, 255, 255, 0.1)'
                }
              }
            },
            plugins: {
              legend: {
                labels: {
                  color: 'white'
                }
              },
              title: {
                display: true,
                text: `Publications in the ${periodText}`,
                color: 'white',
                font: {
                  size: 16
                }
              }
            }
          }
        }
      };
    } else {
      // It's a specific year
      filteredData = data.filter(item => item.journal_year === period);
      periodText = `year ${period}`;
      
      // Get unique journal IDs
      const uniqueJournals = new Set<string>();
      filteredData.forEach(item => {
        if (item.journal_id) {
          uniqueJournals.add(item.journal_id);
        }
      });
      
      return {
        role: 'assistant',
        content: `There were ${uniqueJournals.size} unique journal issues published in ${periodText}.`
      };
    }
  };

  const analyzeTranslators = (data: JournalEntry[], query: string): Message => {
    // Count occurrences of each translator
    const translatorCounts: Record<string, number> = {};
    data.forEach(item => {
      if (item.translator && item.translator !== '-') {
        translatorCounts[item.translator] = (translatorCounts[item.translator] || 0) + 1;
      }
    });
    
    // Sort translators by contribution count
    const sortedTranslators = Object.entries(translatorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 for visualization
    
    if (sortedTranslators.length === 0) {
      return {
        role: 'assistant',
        content: "I couldn't find any translator data in the collection."
      };
    }
    
    // For visualization
    const labels = sortedTranslators.map(([name]) => name);
    const values = sortedTranslators.map(([_, count]) => count);
    
    return {
      role: 'assistant',
      content: `The most active translators in the collection were:\n\n` +
               sortedTranslators.map(([name, count]) => `${name} (${count} translations)`).join('\n'),
      visualization: {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Number of Translations',
            data: values,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          indexAxis: 'y', // Horizontal bar chart
          responsive: true,
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                color: 'white'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            y: {
              ticks: {
                color: 'white'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: 'white'
              }
            },
            title: {
              display: true,
              text: 'Most Active Translators',
              color: 'white',
              font: {
                size: 16
              }
            }
          }
        }
      }
    };
  };

  const findMostProlificAuthor = (data: JournalEntry[]): Message => {
    // Count occurrences of each author
    const authorCounts: Record<string, number> = {};
    data.forEach(item => {
      if (item.author) {
        authorCounts[item.author] = (authorCounts[item.author] || 0) + 1;
      }
    });
    
    // Find top authors
    const topAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5 for visualization
    
    if (topAuthors.length === 0) {
      return {
        role: 'assistant',
        content: "I couldn't determine the most prolific author from the data."
      };
    }
    
    const mostProlificAuthor = topAuthors[0][0];
    const maxCount = topAuthors[0][1];
    
    // Get a list of this author's works
    const authorWorks = data
      .filter(item => item.author === mostProlificAuthor)
      .map(item => `"${item.article_name || 'Untitled'}" (${item.journal_year || 'Unknown year'})`);
    
    // For visualization
    const labels = topAuthors.map(([name]) => name);
    const values = topAuthors.map(([_, count]) => count);
    
    return {
      role: 'assistant',
      content: `The most prolific author in the collection is ${mostProlificAuthor} with ${maxCount} publications:\n\n` +
               authorWorks.join('\n'),
      visualization: {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Number of Publications',
            data: values,
            backgroundColor: 'rgba(255, 99, 132, 0.7)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                color: 'white'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            x: {
              ticks: {
                color: 'white'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: 'white'
              }
            },
            title: {
              display: true,
              text: 'Most Prolific Authors',
              color: 'white',
              font: {
                size: 16
              }
            }
          }
        }
      }
    };
  };

  const analyzeCountries = (data: JournalEntry[]): Message => {
    // Count occurrences of each country
    const countryCounts: Record<string, number> = {};
    data.forEach(item => {
      if (item.country && item.country !== '-') {
        countryCounts[item.country] = (countryCounts[item.country] || 0) + 1;
      }
    });
    
    // Sort countries by representation count
    const sortedCountries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1]);
    
    // For visualization - take top 10 countries
    const top10Countries = sortedCountries.slice(0, 10);
    const labels = top10Countries.map(([country]) => country);
    const values = top10Countries.map(([_, count]) => count);
    
    // Create color palette
    const backgroundColors = [
      'rgba(255, 99, 132, 0.7)',
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(199, 199, 199, 0.7)',
      'rgba(83, 102, 255, 0.7)',
      'rgba(78, 252, 3, 0.7)',
      'rgba(252, 45, 3, 0.7)'
    ];
    
    return {
      role: 'assistant',
      content: `Countries represented in the collection:\n\n` +
               sortedCountries.map(([country, count]) => `${country} (${count} articles)`).join('\n'),
      visualization: {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: backgroundColors,
            borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: 'white'
              }
            },
            title: {
              display: true,
              text: 'Top 10 Countries Represented',
              color: 'white',
              font: {
                size: 16
              }
            }
          }
        }
      }
    };
  };

  const searchArticles = (data: JournalEntry[], query: string): Message => {
    // Extract keywords from the query
    const keywords = query.split(' ')
      .filter(word => word.length > 3)
      .map(word => word.toLowerCase());
    
    // Find articles matching keywords
    const matchingArticles = data.filter(item => {
      if (!item.article_name) return false;
      
      const articleName = item.article_name.toLowerCase();
      return keywords.some(keyword => articleName.includes(keyword));
    });
    
    if (matchingArticles.length === 0) {
      return {
        role: 'assistant',
        content: "I couldn't find any articles matching your query in the collection."
      };
    }
    
    return {
      role: 'assistant',
      content: `Found ${matchingArticles.length} articles that might match your query:\n\n` +
               matchingArticles
                 .slice(0, 10)
                 .map(item => `"${item.article_name || 'Untitled'}" by ${item.author || 'Unknown'} (${item.journal_year || 'Unknown year'})`)
                 .join('\n')
    };
  };

  const findMostActiveDecade = (data: JournalEntry[]): Message => {
    // Count publications by decade
    const decadeCounts: Record<string, number> = {};
    
    data.forEach(item => {
      if (item.journal_year) {
        const year = parseInt(item.journal_year);
        if (!isNaN(year)) {
          const decade = Math.floor(year / 10) * 10;
          decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
        }
      }
    });
    
    // Find the decade with the most publications
    let maxCount = 0;
    let mostActiveDecade = 0;
    
    Object.entries(decadeCounts).forEach(([decade, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostActiveDecade = parseInt(decade);
      }
    });
    
    // Sort all decades by activity
    const sortedDecades = Object.entries(decadeCounts)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0])); // Sort chronologically for timeline
    
    // For visualization
    const labels = sortedDecades.map(([decade]) => `${decade}s`);
    const values = sortedDecades.map(([_, count]) => count);
    
    return {
      role: 'assistant',
      content: `The most active decade for publications was the ${mostActiveDecade}s with ${maxCount} articles.\n\n` +
               `Publication activity by decade:\n` +
               Object.entries(decadeCounts)
                 .sort((a, b) => b[1] - a[1]) // Sort by count for text display
                 .map(([decade, count]) => `${decade}s: ${count} articles`)
                 .join('\n'),
      visualization: {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Number of Publications',
            data: values,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderWidth: 2,
            tension: 0.1,
            fill: true,
            pointBackgroundColor: 'rgba(75, 192, 192, 1)',
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Publications',
                color: 'white'
              },
              ticks: {
                color: 'white'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Decade',
                color: 'white'
              },
              ticks: {
                color: 'white'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: 'white'
              }
            },
            title: {
              display: true,
              text: 'Publication Activity Over Time',
              color: 'white',
              font: {
                size: 16
              }
            }
          }
        }
      }
    };
  };

  // Function to render the appropriate chart based on the message
  const renderChart = (visualization: Message['visualization']) => {
    if (!visualization) return null;
    
    const { type, data, options } = visualization;
    
    switch (type) {
      case 'pie':
        return <div style={{ maxHeight: '300px', marginTop: '1rem' }}><Pie data={data} options={options} /></div>;
      case 'bar':
        return <div style={{ maxHeight: '300px', marginTop: '1rem' }}><Bar data={data} options={options} /></div>;
      case 'line':
        return <div style={{ maxHeight: '300px', marginTop: '1rem' }}><Line data={data} options={options} /></div>;
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>AI Assistant</title>
        <meta name="description" content="AI-powered assistant for the journal collection" />
      </Head>

      <nav className={styles.navbar}>
        <ul className={styles.navList}>
          <li className={styles.navItem}><Link href="/">Main</Link></li>
          <li className={styles.navItem}><Link href="/search">Search</Link></li>
          <li className={styles.navItem}><Link href="/visualizations">Visualizations</Link></li>
          <li className={styles.navItem}><Link href="/ai_chat">AI chat</Link></li>
          <li className={styles.navItem}><Link href="/about">About</Link></li>
        </ul>
      </nav>


      <main className={styles.main} style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        gap: '1.5rem',
        backgroundColor: '#303841',
        padding: '2rem',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        height: 'calc(100vh - 120px)'
      }}>
        <div style={{ 
          width: '80%', 
          backgroundColor: '#3A444E', 
          padding: '1.5rem', 
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          maxHeight: '100%',
          boxSizing: 'border-box'
        }}>
          <h2 style={{ color: 'white', marginTop: 0, marginBottom: '1rem' }}>AI Assistant</h2>
          
          {loading ? (
            <div style={{ 
              color: 'white',
              textAlign: 'center',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <p style={{ fontFamily: 'verdana', fontSize: '1rem' }}>
                Loading the data...
              </p>
            </div>
          ) : (
            <>
              <div style={{
                flex: 1,
                overflowY: 'auto',
                marginBottom: '1rem',
                padding: '1rem',
                backgroundColor: '#2C3440',
                borderRadius: '6px'
              }}>
                {messages.map((message, index) => (
                  <div key={index} style={{
                    marginBottom: '1rem',
                    padding: '0.8rem 1rem',
                    borderRadius: '6px',
                    backgroundColor: message.role === 'user' ? '#4A5964' : '#2C3440',
                    color: 'white',
                    whiteSpace: 'pre-wrap'
                  }}>
                    <strong>{message.role === 'user' ? 'You: ' : 'Assistant: '}</strong>
                    {message.content}
                    {message.visualization && renderChart(message.visualization)}
                  </div>
                ))}
                {thinking && (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '0.8rem 1rem',
                    borderRadius: '6px',
                    backgroundColor: '#2C3440',
                    color: 'white'
                  }}>
                    <strong>Assistant: </strong>
                    Thinking...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              <form onSubmit={handleSubmit} style={{
                display: 'flex',
                gap: '0.5rem'
              }}>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask about the journal collection..."
                  style={{
                    flex: 1,
                    padding: '0.8rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#2C3440',
                    color: 'white'
                  }}
                />
                <button
                  type="submit"
                  disabled={thinking}
                  style={{
                    padding: '0.8rem 1.2rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#00ADB5',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: thinking ? 'not-allowed' : 'pointer',
                    opacity: thinking ? 0.7 : 1
                  }}
                >
                  {thinking ? 'Thinking...' : 'Send'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}