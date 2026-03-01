from llm import LLM

brain = LLM()

results = brain.get_recommendations(input("enter query: "))

if results:
    for i, res in enumerate(results):
        print(f"{i+1}. {res['location_name']} - {res['plan_name']} ${res['price']} (Score: {round(res['final_score'])}%)")
else:
    print("No matches found. Check your 'match_properties' function in Supabase!")