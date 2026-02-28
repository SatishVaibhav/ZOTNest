from llm import LLM

brain = LLM()

print("")
results = brain.get_recommendations("somewhere close to campus that's quiet")

if results:
    for i, res in enumerate(results):
        print(f"{i+1}. {res['location_name']} (Match: {round(res['similarity'])}%)")
else:
    print("No matches found. Check your 'match_properties' function in Supabase!")