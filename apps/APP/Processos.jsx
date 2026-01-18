import React, { useState } from 'react'

export default function Processos() {
  const [formData, setFormData] = useState({
    target_id: '',
    client_code: '',
    sources: ['pje', 'espaider', 'instagram']
  })
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await fetch('http://localhost:8000/api/pipeline/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target_id: formData.target_id,
          client_code: formData.client_code || null,
          sources: formData.sources,
          fetch_related: false
        })
      })

      if (!res.ok) {
        throw new Error(`Erro na requisição: ${res.statusText}`)
      }

      const data = await res.json()
      setResponse(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Gestão de Processos</h2>
      
      {/* Card de Nova Pesquisa */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Iniciar Nova Varredura</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">CNJ / Target ID</label>
              <input
                type="text"
                name="target_id"
                required
                placeholder="Ex: 0000000-00.2024.8.13.0000"
                value={formData.target_id}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Código Cliente (Opcional)</label>
              <input
                type="text"
                name="client_code"
                placeholder="Ex: 0345"
                value={formData.client_code}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processando...' : 'Iniciar Pipeline'}
            </button>
          </div>
        </form>

        {/* Feedback */}
        {error && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {response && (
          <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Sucesso!</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>{response.message}</p>
                  <p className="mt-1 font-mono">Status: {response.status}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Processos (Placeholder) */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Últimos Processos</h3>
        <p className="text-gray-500 italic">A listagem de processos do banco de dados será integrada em breve.</p>
      </div>
    </div>
  )
}
