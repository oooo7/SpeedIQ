import Link from "next/link";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function UnsubscribeThankYouPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const isError = error === "invalid" || error === "error" || error === "missing";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        {isError ? (
          <>
            <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              This unsubscribe link may be invalid or expired. If you continue to receive emails,
              please contact the sender.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">
              You&apos;re unsubscribed
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              You have been successfully removed from this mailing list and will not receive
              further campaign emails.
            </p>
          </>
        )}
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
