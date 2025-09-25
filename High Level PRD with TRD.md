

# High Level PRD with TRD

![][image1]

Above diagram in mermaid 👍graph LR  
    %% Define Node Groups (for layout)  
    subgraph Clients  
        c1("client 1")  
        c2("client 2")  
        c3("client 3")  
    end

    subgraph Projects  
        p1("project 1")  
        p2("project 2")  
        p3("project 3")  
        p4("project 4")  
        p5("project 5")  
    end

    subgraph Tasks  
        t1("Task 1")  
        t2("Task 2")  
        t3("Task 3")  
        t4("Task 4")  
        t5("Task 5")  
        t6("Task 6")  
        t7("Task 7")  
        t8("Task 8")  
        t9("Task 9")  
        t10("Task 10")  
    end

    subgraph Resources  
        r1("Resource 1")  
        r2("Resource 2")  
        r3("Resource 3")  
        r4("Resource 4")  
    end

    %% Define Connections  
    c1 \--\> p1 & p2  
    c2 \--\> p3  
    c3 \--\> p4 & p5

    p1 \--\> t1 & t2  
    p2 \--\> t3 & t4  
    p3 \--\> t5 & t6 & t7  
    p4 \--\> t8  
    p5 \--\> t9 & t10

    t1 & t2 \--\> r1  
    t3 & t4 & t5 \--\> r2  
    t6 & t7 \--\> r3  
    t8 & t9 & t10 \--\> r4

    %% Define Styles  
    classDef client fill:\#cde4f9,stroke:\#5a8dc2,stroke-width:2px  
    classDef project fill:\#d5f0c8,stroke:\#6da359,stroke-width:2px  
    classDef task fill:\#fef9d8,stroke:\#c4a742,stroke-width:2px  
    classDef resource fill:\#fcd7d3,stroke:\#c5675e,stroke-width:2px

    %% Apply Styles to Nodes  
    class c1,c2,c3 client  
    class p1,p2,p3,p4,p5 project  
    class t1,t2,t3,t4,t5,t6,t7,t8,t9,t10 task  
    class r1,r2,r3,r4 resource

![][image2]

Above diagram in mermaid:

erDiagram  
    CLIENT ||--|{ PROJECT : "has"  
    PROJECT ||--|{ TASK : "contains"  
    TASK }o--o| RESOURCE : "is assigned"  
    TASK ||--|{ TASK : "subtask"

Above diagrams tell us relationship among the important classes. 

Now we basically want to support two main functions:

Creating schedule 

![][image3]

For this flow will be something like this

Create schedule request \-\> we start to create task. \-\> then we assign task to resources. 

For task creation we follow these steps:

1. Fetch project and client info, so that we can make sense of what needs to be done.   
2. Create tasks and subtasks out of it. (Take user feedback by showing them what has been created, if they suggest alteration, update/create task accordingly   
3. Assign estimate to each task, take user’s input for each task estimate.   
4. Assign priority to each task and take feedback from user. 

For assigning tasks to resources, we follow these steps:

1. Sort task across whole agency, or the minimum entity for which resources are defined, because from that resource common pool, we need to assign the tasks. And take user feedback, for across the task ranking. If user suggests something, take care of it .  
2. Match the right resources based on bandwidth, priority, skill to complete task

Update Schedule request: 

**![][image4]**

For this user would request with text message on what needs to be updated. 

The flow would be something like this

Update schedule \-\> create new tasks for incoming request \-\> update existing task based on incoming requests \-\> assign task to resources.  

To create new task for incoming request we follow these steps:

1. Fetch project and client details  
2. Create new tasks and subtasks based on updates provided  
3. Assign estimate to each task and take user input  
4. Assign priority to each task. And take user input. 

To update existing tasks we follow these steps:

1. Find possibly affected tasks with new input   
2. Ask User feedback for in\_progress tasks  
3. Modify tasks according to new input  
4. Assign an estimate for each task and ask for user feedback.   
5. Assign priority to each task and ask for user feedback. 

Assign Tasks to resources, follow these steps. 

1. Sort tasks across whole department of resources. And show user the DELTA from previous priority to now and what is being delayed. (show new expected eta compared to old one)  
2. Match right resource with right task and show new assignments to user and ask for feedback (feedback from user on DELTA)

There would be couple of logics which still need to be written, please keep these either mocked or as simple as possible:

1. Deciding priority of tasks. (for now use single prompt LLM response for this), priority score from 1 to 100, where 1 being highest. Can be a decimal number as well.   
2. Breaking projects into tasks. (for now directly use LLM to do this, with single prompt.)   
3. Deciding estimates (for now use single prompt LLM response for this)  
4. LLM api connection (keep it abstract and provide openrouter implementation and Gemini Google studio api integration)  
5. Resource matching : for now just perform based on bandwidth available, we will add more criteria of matching later.   
6. Task sorting : as of now keep it based on priority, but design so that later it’s possible to add more criterias.   
7. Create new tasks for incoming update:: as of now use LLM response by sending the full project, client context and incoming proposed change, get response in form of new tasks.   
8. Find affected tasks for incoming update : provide incoming text, existing affected tasks derived via embeddings, project and client info, and get modified tasks as response.   
9. Delta feedback to user for priority change: show all the tasks and projects with changed ETA, show both old and new ETA.. 

How User will interact:

1. User would provide Agency’s current goal : earn high, retaining certain type of client, or specifically prioritizing some client or some type of project.   
2. User would provide full client info with impact and money given by client.and other relevant info. Overall which decides importance and urgency of client.   
3. User can then add any project by selecting the relevant client.   
4. User can provide feedback on different phases, via accepting/rejecting/suggesting edit, all via a text window.   
5. 

Enhancement: 

1. Task Dependencies :   
   1. Create a task dependency map, which shows dependencies of each task on other related task.   
   2. Use this to derive which all tasks can be parallelized and which needs to be taken sequentially   
2. Based on User Actions/ Data / Task completions, the feedback is taken by the system to enhance the prediction quality of different phases.   
3. On updation of schedule, the context switch should also be considered as one of the negative weights for re-assignment. 
