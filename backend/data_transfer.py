class DataTransfer:
    def __init__(self):
        self.query = None
    
    @staticmethod
    def send_to_LLM(self, query):
        self.query = query
    
    @staticmethod    
    def get_query(self):
        return self.query