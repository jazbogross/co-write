
interface ProfileLoadingProps {
  isAuthLoading?: boolean;
  fetchError?: string | null;
}

export function ProfileLoading({ isAuthLoading = false, fetchError = null }: ProfileLoadingProps) {
  if (isAuthLoading) {
    return (
      <div className="container py-8 text-center">
        <div className="text-lg">Checking authentication...</div>
        <div className="text-sm text-gray-500 mt-2">Please wait while we verify your session</div>
      </div>
    );
  }

  return (
    <div className="container py-8 text-center">
      <div className="text-lg">Loading profile...</div>
      <div className="text-sm text-gray-500 mt-2">Fetching your data and scripts</div>
      {fetchError && (
        <div className="mt-4 p-4 bg-red-50 text-red-800 rounded">
          <div className="font-semibold">Error loading data:</div>
          <div>{fetchError}</div>
        </div>
      )}
    </div>
  );
}
