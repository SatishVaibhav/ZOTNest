from llm import LLM

# Initialize your brain
brain = LLM()

# Mock a user asking a question
print("")
results = brain.get_recommendations("")

if results:
    for i, res in enumerate(results):
        print(f"{i+1}. {res['location_name']} (Match: {round(res['similarity'])}%)")
else:
    print("No matches found. Check your 'match_properties' function in Supabase!")