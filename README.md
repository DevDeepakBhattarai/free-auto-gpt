# Chat with your PDF file

## Clone the repo

**Note**:

1. If you do not have `git` in your pc. Install `git`
1. You will need `Node js` and `python` installed in your to use this app

#### Run the command below in `powershell` or `bash` in the directory you want this app in.

```
git clone https://github.com/DevDeepakBhattarai/ask-your-pdf.git
```

### **Updating Environment Variables for the Express and Flask Apps**

Thank you for using our Express and Flask apps! Before you get started, please follow the instructions below to set up the necessary environment variables for both apps.

## **1. For the Express App (JavaScript - js/):**

In the `js` folder, you will find our Express app. To run it successfully, you need to update the `.env.example` file with your specific configurations. Here's how you can do it:

1. Locate the file named `.env.example` in the `js` folder.
1. Rename it to `.env`
1. Open the `.env` file using a text editor.
1. Find the following variables:
   - `EMAIL`: Replace this with your chat gpt email address.
   - `PASSWORD`: Replace this with your chat gpt password.

Make sure to save the changes after updating the variables. The Express app will now be able to use the values you provided in the `.env` file.

## **2. For the Flask App (Python - py/):**

In the `py` folder, you will find our Flask app. To set up the environment for this app, follow these steps:

1. Navigate to the `py` folder.
2. Look for the `.env.example` file and rename it to `.env` ;open it with a text editor.
3. You will find the following variables in the `.env` file:
   - `PINECONE_API_KEY`: Replace this with your Pinecone API key, which is required for certain functionalities in the app.
   - `PINECONE_ENVIRONMENT`: Replace this with the appropriate environment setting for your Pinecone account.

Once you have updated the values for these variables, save the changes to the `.env` file.

### **For Pinecone api key**

1. Goto [Pinecone](https://app.pinecone.io/)
1. Login to the site.
1. Click on the api key in the left side of the screen
1. Copy the api key and environment
1. Paste it in the `.env` folder in `./py/`

With these environment variables set up in both apps, you are now ready to run the Express and Flask apps with your custom configurations.

## Running the Apps:

1. Run the `install.bat` file which is provided
2. Once the installation is complete run the `run.bat`
3. Once both the apps are running navigate to `http://localhost:5000` to use the app

#### Note:

If the apps stops working just delete the `cookies.json` in the `js` directory and it will start working again (hopefully)
