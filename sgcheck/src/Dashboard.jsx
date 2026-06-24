import { motion } from 'framer-motion'
import BentoCard from './components/BentoCard'
import UploadZone from './components/UploadZone'
import GPSForm from './components/GPSForm'

function Dashboard({ uploadedImage, onImageUpload, gpsData, onGPSSubmit }) {
  const metrics = [
    { label: 'Total Analysis', value: '1,247', icon: 'chart', color: 'primary' },
    { label: 'Success Rate', value: '94.2%', icon: 'check', color: 'primary' },
    { label: 'Avg Growth', value: '18 days', icon: 'leaf', color: 'primary' },
    { label: 'Active Fields', value: '42', icon: 'map', color: 'primary' },
  ]

  return (
    <div className="min-h-screen bg-bg p-4 md:p-8">
      {/* Decorative Corner Borders */}
      <div className="fixed top-0 left-0 w-24 h-24 border-t-4 border-l-4 border-primary pointer-events-none"></div>
      <div className="fixed top-0 right-0 w-24 h-24 border-t-4 border-r-4 border-primary pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 w-24 h-24 border-b-4 border-l-4 border-primary pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-24 h-24 border-b-4 border-r-4 border-primary pointer-events-none"></div>

      <header className="max-w-7xl mx-auto mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-none bg-primary flex items-center justify-center shadow-portis-card">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div>
            <h1 className="vintage-heading">CaneSense</h1>
            <p className="text-gray-600">Smart Agriculture Platform</p>
          </div>
        </motion.div>
      </header>

      <main className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <BentoCard span="col-span-1 md:col-span-2 lg:col-span-4" delay={0.1}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-none bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="vintage-heading">Dashboard Overview</h2>
                <p className="text-gray-600 text-sm">Real-time monitoring metrics</p>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="p-4 rounded-none bg-card border-2 border-primary shadow-portis-card"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                    {metric.label}
                  </p>
                  <p className="metric-value">
                    {metric.value}
                  </p>
                </motion.div>
              ))}
            </div>
          </BentoCard>

          <BentoCard span="col-span-1 md:col-span-1 lg:col-span-2 row-span-2" delay={0.2}>
            <UploadZone onImageUpload={onImageUpload} uploadedImage={uploadedImage} />
          </BentoCard>

          <BentoCard span="col-span-1 md:col-span-1 lg:col-span-2 row-span-2" delay={0.3}>
            <GPSForm onSubmit={onGPSSubmit} gpsData={gpsData} />
          </BentoCard>

          <BentoCard span="col-span-1 md:col-span-2 lg:col-span-4" delay={0.4}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-none bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-primary">Recent Activity</h3>
                <p className="text-gray-600 text-sm">Latest analysis results</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { id: 1, name: 'Field A-12 Analysis', status: 'Complete', time: '2 mins ago', health: 92 },
                { id: 2, name: 'Field B-05 Analysis', status: 'Processing', time: '5 mins ago', health: 78 },
                { id: 3, name: 'Field C-08 Analysis', status: 'Complete', time: '12 mins ago', health: 88 },
              ].map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + item.id * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-none bg-card border-2 border-gray-300"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-none ${item.status === 'Complete' ? 'bg-primary' : 'bg-yellow-500'}`} />
                    <div>
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-600">{item.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-none ${
                      item.status === 'Complete'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-yellow-500/10 text-yellow-600'
                    }`}>
                      {item.status}
                    </span>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{item.health}%</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </BentoCard>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto mt-8 py-6 text-center text-gray-600 text-sm border-t-2 border-primary pt-4">
        <p>CaneSense Agriculture Platform v1.0</p>
      </footer>
    </div>
  )
}

export default Dashboard
