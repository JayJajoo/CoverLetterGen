from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.document_loaders import WebBaseLoader
from prompts import ctmp3, code3, code4, ctmp4, combined_resume_content
from web_automation import scrape_linkedIn, scrape_NUworks
import asyncio
from langchain_core.globals import set_verbose

load_dotenv()
set_verbose(False)

def generate_cv(link=None,resume_content=None,user_id=None,job_description=None):
    llm = ChatOpenAI(model="gpt-4.1-nano",temperature=0.7)
    jd = job_description
    if job_description==None:
        if link.__contains__("www.linkedin.com"):
            jd = asyncio.run(scrape_linkedIn(link=link))
        elif link.__contains__("northeastern-csm.symplicity.com"):
            jd = asyncio.run(scrape_NUworks(link=link))
        else:  
            doc = WebBaseLoader([link]).load()
            jd = doc[0].page_content
    if jd:
        template = ChatPromptTemplate.from_messages([
            ("system",ctmp4),
            ("user","Retrun the code starting from import statements till end with all the 4 paras mentioned and infomation filled and the document should be of 1 page only.")
        ])
        prompt = template.format_prompt(
            code=code4.replace("[###USER_ID###]",str(user_id)),
            job_description=jd,
            combined_resume_content=resume_content
        )
        cv = llm.invoke(prompt)
        exec(cv.content)

# template = ChatPromptTemplate.from_messages([
#     ("system",ctmp3),
#     ("user","Retrun the code starting from import statements till end with all the 3 paras mentioned and infomation filled.")
# ])
# resume_content = combined_resume_content
# prompt = template.format_prompt(code=code3,job_description=job_description,combined_resume_content=resume_content)
# cv = llm.invoke(prompt)
