package jspack.impls;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.PrintWriter;

import jspack.INeedPackHandler;

public class PackHandlerImpl implements INeedPackHandler {

	@Override
	public void handle(String destFile, String[] srcFiles) {
		File dest = new File(destFile);
		if(dest.exists())
		{
			dest.delete();
		}
		PrintWriter writer = null;
		try {
			writer = new PrintWriter(dest);
		} catch (FileNotFoundException e1) {
			
			e1.printStackTrace();
		}
		for(String src : srcFiles)
		{
			try {
				BufferedReader reader = new BufferedReader(new FileReader(src));
				String line = reader.readLine();
				while(line != null)
				{
					writer.println(line);
					line = reader.readLine();
				}
				reader.close();
			} catch (Exception e) {
				
			}
		}
		writer.close();
	}

}
