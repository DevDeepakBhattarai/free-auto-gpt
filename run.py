from langchain.document_loaders import PyPDFLoader
loader=PyPDFLoader('inputFiles/test.pdf')
print(loader.load()[0].page_content)