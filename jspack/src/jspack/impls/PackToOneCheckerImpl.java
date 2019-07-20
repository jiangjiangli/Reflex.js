package jspack.impls;

import java.io.File;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jspack.INeedPackHandler;
import jspack.IPackToOneChecker;

/**
  *  搜索具有 相同前缀的文件，如果有更新，则发出通知
 * @author jiangjiang
 *
 */
public class PackToOneCheckerImpl implements IPackToOneChecker {

	private Map<String, Map<String, FileInfo2>> name2Files = new HashMap<String, Map<String, FileInfo2>>();
	
	private Map<String, HandleEvent> events = new HashMap<String, HandleEvent>();
	
	private Thread checkThread;
	
	private INeedPackHandler handler;
	
	private boolean isDisposed;
	
	private String dir;
	
	@Override
	public void check(String dir) {
		this.dir = dir;
		checkThread = new Thread(new Runnable() {			
			@Override
			public void run() {
				runInThread();
			}
		});
		checkThread.setDaemon(true);;
		checkThread.start();
	}

	@Override
	public void addNeedPackHandlder(INeedPackHandler handler) {
		this.handler = handler;
	}
	
	@Override
	public void handle() {
		if(this.handler == null)
		{
			return;
		}
		synchronized (events) {
			for(Map.Entry<String, HandleEvent> entry : events.entrySet())
			{
				HandleEvent event = entry.getValue();
				this.handler.handle(event.dest, event.sources);
			}
			events.clear();
		}
	}
	
	public void dispose()
	{
		isDisposed = true;
	}

	
	private void runInThread()
	{    
		while(!isDisposed)
		{
			//搜索本文件夹下，所有的文件,找a-b.js匹配的文件
			File dir = new File(this.dir);
			File[] files = dir.listFiles();
			
			Map<String,  Map<String, FileInfo2>> newName2Files = new HashMap<String,  Map<String, FileInfo2>>();
			for(File file : files)
			{
				String fileName = file.getName();
				if(!fileName.endsWith(".js"))
				{
					continue;
				}
				int index = fileName.indexOf('_');
				if(index <= 0)
				{
					continue;
				}
				String prefix = fileName.substring(0,  index);
				Map<String, FileInfo2> children = null;
				if(!newName2Files.containsKey(prefix))
				{
					children = new HashMap<String, FileInfo2>();
					newName2Files.put(prefix, children);
				}
				children = newName2Files.get(prefix);
				if(!children.containsKey(fileName))
				{
					children.put(fileName, new FileInfo2(file));
				}
			}
			
			//和原有比较		
			for(Map.Entry<String,  Map<String, FileInfo2>> entry : newName2Files.entrySet())
			{
				String name = entry.getKey();
				Map<String, FileInfo2> value = entry.getValue();
				if(!name2Files.containsKey(name))
				{
					addUpdate(entry);
					continue;
				}
				Map<String, FileInfo2> old = name2Files.get(name);
				if(old.values().size() != value.values().size())
				{
					addUpdate(entry);
					continue;
				}
				for(Map.Entry<String, FileInfo2> entry2 : value.entrySet())
				{
					String fileName = entry2.getKey();
					FileInfo2 info2 = entry2.getValue();
					if(!old.containsKey(fileName))
					{
						addUpdate(entry);
						break;
					}else if(info2.lastModified != old.get(fileName).lastModified)
					{
						addUpdate(entry);
						break;
					}
				}
			}
			
			this.name2Files = newName2Files;
			try {
				Thread.sleep(500);
			} catch (InterruptedException e) {
			}
		}
		
	}
	
	private void addUpdate(Map.Entry<String,  Map<String, FileInfo2>> entry)
	{
		synchronized (events) {
			String name = entry.getKey();
			Map<String, FileInfo2> map = entry.getValue();
			
			events.put(name,  new HandleEvent(this.dir, name, map));
		}
	}
	
	private static class FileInfo2
	{
		private long lastModified;
		private String filePath;
		
		FileInfo2(File file)
		{
			this.filePath = file.getAbsolutePath();	
			this.lastModified  = file.lastModified();
		}
	}
	
	private static class HandleEvent
	{
		String dest;
		String[] sources;
		
		HandleEvent(String dir, String name, Map<String, FileInfo2> map)
		{
			int count = map.size();
			this.sources = new String[count];
			int i = 0;
			for(FileInfo2 info : map.values())
			{
				this.sources[i++] = info.filePath;
			}
			
			this.dest =  dir + File.separator + name + ".js";
		}
	}


}
