export default function WarningPanel({ children }) {
  return (
    <div className="text-center lil-text mt-8">
      <div className="inline-block py-2 px-4 border border-yellow-200 rounded-lg bg-[#fef6aa]">
        {children}
      </div>
    </div>
  )
}
