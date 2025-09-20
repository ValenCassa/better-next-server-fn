"use client";

import { useState } from "react";
import { createUser, processForm } from "@/examples/03-validation-examples";

function UserCreationExample() {
  const [state, setState] = useState<{ result: string; loading: boolean }>({
    result: "",
    loading: false,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState({ result: "", loading: true });

    const formData = new FormData(e.currentTarget);

    const response = await createUser({
      input: {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        age: parseInt(formData.get("age") as string),
      },
    });

    if (response.ok) {
      setState({
        result: `✅ User created: ${response.data.user.name} (ID: ${response.data.id})`,
        loading: false,
      });
      return;
    }

    setState({
      result: `❌ Error: ${response.errors.join(", ")}`,
      loading: false,
    });
  };

  return (
    <div className="p-6 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">Create User (Zod Validation)</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name:</label>
          <input
            name="name"
            type="text"
            required
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter name (min 2 chars)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email:</label>
          <input
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter valid email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Age:</label>
          <input
            name="age"
            type="number"
            required
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter age (min 18)"
          />
        </div>

        <button
          type="submit"
          disabled={state.loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {state.loading ? "Creating..." : "Create User"}
        </button>
      </form>

      {state.result && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <pre className="text-sm">{state.result}</pre>
        </div>
      )}
    </div>
  );
}

function FormDataExample() {
  const [state, setState] = useState<{ result: string; loading: boolean }>({
    result: "",
    loading: false,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState({ result: "", loading: true });

    const formData = new FormData(e.currentTarget);

    // TypeScript shows ExpectedInput<{name, email}> but accepts FormData at runtime
    const response = await processForm({
      input: formData as FormData & { name: string; email: string },
    });

    if (response.ok) {
      setState({
        result: `✅ Form processed: ${JSON.stringify(response.data, null, 2)}`,
        loading: false,
      });
      return;
    }

    setState({
      result: `❌ Error: ${response.errors.join(", ")}`,
      loading: false,
    });
  };

  return (
    <div className="p-6 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">
        Process Form (FormData Validation)
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name:</label>
          <input
            name="name"
            type="text"
            required
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter your name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email:</label>
          <input
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter your email"
          />
        </div>

        <button
          type="submit"
          disabled={state.loading}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          {state.loading ? "Processing..." : "Process Form"}
        </button>
      </form>

      {state.result && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <pre className="text-sm">{state.result}</pre>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          Server Function Examples
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          <UserCreationExample />
          <FormDataExample />
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-bold mb-2">How it works:</h3>
          <ul className="text-sm space-y-1">
            <li>
              • <strong>Left:</strong> Zod validation - input is fully typed for
              both function call and handler
            </li>
            <li>
              • <strong>Right:</strong> Custom validation - FormData input,
              typed handler result
            </li>
            <li>
              • Both return standardized <code>{"{ok, data?, errors?}"}</code>{" "}
              responses
            </li>
            <li>• Validation errors are gracefully handled and displayed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
