import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function TestDatabase() {
  const [status, setStatus] = useState<string>('Loading users...')
  const [users, setUsers] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      try {
        const { data, error } = await supabase
          .from('Users')
          .select('*')

        if (error) {
          setError(error.message)
          setStatus('Failed to load users')
        } else {
          setUsers(data || [])
          setStatus(`Successfully loaded ${data?.length || 0} users`)
        }
      } catch (err) {
        setError((err as Error).message)
        setStatus('Failed to connect to database')
      }
    }

    fetchUsers()
  }, [])

  return (
    <div style={{ padding: '20px', backgroundColor: 'white', color: 'black' }}>
      <h1>Users from Supabase</h1>
      <p><strong>Status:</strong> {status}</p>
      
      {error && (
        <div style={{ padding: '10px', backgroundColor: '#ffcccc', color: 'red', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {users.length > 0 ? (
        <div>
          <h2>User List ({users.length} total)</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                {Object.keys(users[0]).map(key => (
                  <th key={key} style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f9f9f9' }}>
                  {Object.values(user).map((value, i) => (
                    <td key={i} style={{ border: '1px solid #ddd', padding: '12px' }}>
                      {JSON.stringify(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ marginTop: '30px' }}>Raw JSON Data:</h3>
          <pre style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px', overflow: 'auto' }}>
            {JSON.stringify(users, null, 2)}
          </pre>
        </div>
      ) : (
        !error && <p>No users found in the database.</p>
      )}
    </div>
  )
}

export default TestDatabase